import * as babel from "@babel/core";
import { SpecialPath } from "@common/workspace/Workspace";
import { EntryStorage } from "@storage/EntryStorage";
import { StoragePath } from "@storage/StoragePath";
import { ContentIdentity, getContentIdentity, getContentIdentityForData } from "@sync/ContentIdentity";
import * as React from "react";
import { Document, DocumentEditorStateAdapter } from "../document/Document";
import { setupPluginDeps } from "./SetupPluginDeps";
import "react-data-grid/lib/styles.css";


export interface EditorProps {
  doc: Document;
  className?: string;
}


export type PluginLoadSpec = StoragePath | (new () => PluginExport);


export interface PluginMeta {
  name: string;
  load: PluginLoadSpec;
}


export class PluginManager {
  constructor(storage: EntryStorage) {
    this.storage = storage;
    setupPluginDeps();
  }


  private storage: EntryStorage;


  async discoverPlugins(): Promise<void> {
    for (const child of await this.storage.children(SpecialPath.PluginsDir)) {
      const stat = await child.stats();
      if (!stat.isDirectory) {
        continue;
      }

      const entryPoint = await this.findFirstFile(child.path, [ "index.js", "index.jsx" ]);
      if (!entryPoint) {
        // plugin entry point not found
        console.error(`Plugin entry file not found for plugin ${ child.path }: index.js or index.jsx expected`);
        return;
      }

      this.registerPlugin({
        name: child.path.basename,
        load: entryPoint,
      });
    }
  }


  private async findFirstFile(parent: StoragePath, names: string[]) {
    for (const name of names) {
      const path = parent.child(name);
      if (await this.storage.exists(path)) {
        return path;
      }
    }

    return undefined;
  }


  async getCustomEditorForDocument(doc: Document) {
    const editorSpec = doc.settings.editor?.name;
    if (!editorSpec) {
      return undefined;
    }

    const [ pluginName, editorName ] = editorSpec.split(".");

    const editorPlugin = await this.loadPluginByName(pluginName);
    if (editorPlugin) {
      return editorPlugin.editors[editorName];
    } else {
      return undefined;
    }
  }


  private registerPlugin(plugin: PluginMeta) {
    try {
      if (this.plugins.some(x => x.name === plugin.name)) {
        throw new Error(`Cannot register plugin ${ plugin.name }: another plugin with this name already exists`);
      }

      this.plugins.push(plugin);
    } catch (e: any) {
      alert(`Failed to register plugin ${ plugin.name }: ${ e.message }`);
    }
  }


  private async loadPluginByName(name: string): Promise<PluginExport | undefined> {
    const plugin = this.plugins.find(x => x.name === name);
    if (!plugin) {
      return undefined;
    }

    return this.loadPlugin(plugin.name, plugin.load);
  }


  private async loadPlugin(name: string, loadSpec: PluginLoadSpec): Promise<PluginExport> {
    const cached = this.loadedPlugins.get(name);
    if (cached != null) {
      if (await filesChanged(this.storage, cached.files)) {
        this.loadedPlugins.delete(name);
      } else {
        return cached.plugin;
      }
    }

    if (typeof loadSpec === "function") {
      const plugin = new loadSpec();
      this.loadedPlugins.set(name, {
        plugin,
        files: {}
      });
      return plugin;
    }

    let scriptSourceBuf = await this.storage.read(loadSpec);
    const { code, imports } = await transformScriptText(loadSpec.basename, scriptSourceBuf.toString());
    const loaded = await this.loadScript(code, imports);

    this.loadedPlugins.set(name, {
      plugin: loaded,
      files: {
        [loadSpec.toString()]: getContentIdentityForData(scriptSourceBuf)
      }
    });
    return loaded;
  }


  private async loadScript(scriptText: string, imports: string[]): Promise<PluginExport> {
    const pluginExport: any = {};

    async function importModule(module: string): Promise<unknown> {
      switch (module) {
        case "react":
          return await import("react");
        case "mobx":
          return await import("mobx");
        case "mobx-react-lite":
          return await import("mobx-react-lite");
        case "date-fns":
          return await import("date-fns");
        case "@mui/material":
          return await import("@mui/material");
        case "csv":
          return await import("csv");
        case "react-data-grid":
          return await import("react-data-grid");
        case "@mui/x-date-pickers":
          return await import("@mui/x-date-pickers");
        default:
          throw new Error("Cannot require module " + module);
      }
    }

    await Promise.all(imports.map(async (module) => {
      this.cachedImports[module] = this.cachedImports[module] || await importModule(module);
    }));

    new Function("require", "exports", scriptText)((mod: string) => {
      if (!this.cachedImports[mod]) {
        throw new Error("Cannot require module " + mod);
      }

      return this.cachedImports[mod];
    }, pluginExport);
    return pluginExport;
  }


  private readonly plugins: PluginMeta[] = [];
  private readonly loadedPlugins = new Map<string, LoadedPluginData>();
  private readonly cachedImports: Record<string, unknown> = {};
}


async function filesChanged(storage: EntryStorage, files: Record<string, ContentIdentity>): Promise<boolean> {
  const results = await Promise.all(Object.values(files).map(async ([ path, prev ]) => {
    const actual = await getContentIdentity(storage.get(new StoragePath(path)));
    return actual !== prev;
  }));

  return results.some(x => !!x);
}


export async function transformScriptText(filename: string, scriptText: string): Promise<{ code: string, imports: string[] }> {
  const imports: string[] = [];

  const r = await babel.transformAsync(scriptText, {
    filename,
    comments: false,
    presets: [ require("@babel/preset-react"), require("@babel/preset-typescript") ],
    plugins: [
      [require("@babel/plugin-transform-modules-commonjs").default, {
        importInterop: "none",
      }],
      {
        visitor: {
          ImportDeclaration: path => {
            let importPath = path.node.source.value;
            if (!imports.includes(importPath)) {
              imports.push(importPath);
            }
          }
        }
      }
    ]
  });

  if (!r || !r.code) {
    throw new Error("Compilation failed: babel returned no result");
  }

  return { code: r?.code, imports };
}


interface LoadedPluginData {
  plugin: PluginExport;
  files: Record<string, ContentIdentity>;
}


export interface PluginExport {
  editors: {
    [name: string]: {
      component: React.ComponentType<EditorProps>
      stateAdapter?: new (doc: Document, initialContent: Buffer) => DocumentEditorStateAdapter;
    }
  };
}
