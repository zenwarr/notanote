import * as babel from "@babel/core";
import { EntryStorage, StorageError, StorageErrorCode } from "@storage/entry-storage";
import { resolveImport } from "@storage/resolve-import";
import { SpecialPath } from "@storage/special-path";
import { StoragePath } from "@storage/storage-path";
import { ContentIdentity, getContentIdentityForData } from "@sync/ContentIdentity";
import * as React from "react";
import "react-data-grid/lib/styles.css";
import { Document, DocumentEditorStateAdapter } from "../document/Document";


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
    setupPluginEnv();
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
    if (typeof loadSpec === "function") {
      const plugin = new loadSpec();
      this.loadedPlugins[name] = plugin;
      return plugin;
    }

    const plugin = await this.loadScript<PluginExport>(loadSpec, true);
    this.loadedPlugins[name] = plugin;
    return plugin;
  }


  private async loadScript<ExportType = unknown>(path: StoragePath, transform: boolean): Promise<ExportType> {
    let scriptSourceBuf: Buffer;
    try {
      scriptSourceBuf = await this.storage.read(path);
    } catch (err) {
      if (err instanceof StorageError && err.code === StorageErrorCode.NotExists) {
        const e: any = new Error();
        e.code = "MODULE_NOT_FOUND";
        throw e;
      } else {
        throw err;
      }
    }

    const actualIdentity = getContentIdentityForData(scriptSourceBuf);

    const cached = this.loadedScripts[path.normalized];
    if (cached != null) {
      if (actualIdentity !== cached.identity) {
        delete this.loadedScripts[path.normalized];
      } else {
        return cached.exports as ExportType;
      }
    }

    const { code, imports } = await processScriptText(path.basename, scriptSourceBuf.toString(), transform);
    const exp = await this.loadParsedScript(path, code, imports);

    this.loadedScripts[path.normalized] = {
      exports: exp,
      identity: actualIdentity
    };

    return exp as ExportType;
  }


  private async resolveAndLoad(from: StoragePath, spec: string): Promise<unknown> {
    const path = await resolveImport(this.storage, from, spec, {
      extensions: [ "js", "jsx", "ts", "tsx" ]
    });

    if (!path) {
      const e: any = new Error(`Module not found: ${ spec }, loading from ${ from.normalized }`);
      e.code = "MODULE_NOT_FOUND";
      throw e;
    }

    return this.loadScript(path, path.parts.some(x => x === "node_modules"));
  }


  private async loadParsedScript<ExportType = unknown>(source: StoragePath, scriptText: string, imports: string[]): Promise<ExportType> {
    await Promise.all(imports.map(async (module) => {
      let resolved: unknown = this.cachedImports[module] || await importModule(module);
      if (!resolved) {
        resolved = await this.resolveAndLoad(source, module);
      }

      this.cachedImports[module] = resolved;
    }));

    const mod: any = {};
    const exp: any = {};
    new Function("require", "module", "exports", scriptText)((mod: string) => {
      if (!this.cachedImports[mod]) {
        throw new Error(`Cannot import module ${ mod } from ${ source.normalized }`);
      }

      return this.cachedImports[mod];
    }, mod, exp);

    return mod.exports ? await mod.exports : exp;
  }


  private readonly plugins: PluginMeta[] = [];
  private readonly loadedPlugins: Record<string, PluginExport> = {};
  private readonly loadedScripts: Record<string, { identity: ContentIdentity, exports: unknown }> = {};
  private readonly cachedImports: Record<string, unknown> = {};
}


export async function processScriptText(filename: string, scriptText: string, transform: boolean): Promise<{ code: string, imports: string[] }> {
  const imports: string[] = [];

  const r = await (transform ? babel.transformAsync : babel.parseAsync)(scriptText, {
    filename,
    comments: false,
    presets: [ require("@babel/preset-react"), require("@babel/preset-typescript") ],
    plugins: [
      [ require("@babel/plugin-transform-modules-commonjs").default, {
        importInterop: "none",
      } ],
      {
        visitor: {
          ImportDeclaration: path => {
            let importPath = path.node.source.value;
            if (!imports.includes(importPath)) {
              imports.push(importPath);
            }
          },
          // CallExpression: path => {
          //   let func = path.node.callee;
          //   let arg = path.node.arguments[0];
          //   if (func.type === "Identifier" && func.name === "require" && arg.type === "StringLiteral") {
          //     let importPath = arg.value;
          //     if (!imports.includes(importPath)) {
          //       imports.push(importPath);
          //     }
          //   }
          // }
        }
      }
    ]
  });

  if (!r || (transform && !(r as any).code)) {
    throw new Error("Compilation failed: babel returned no result");
  }

  return { code: transform ? (r as any)?.code : scriptText, imports };
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


const PLUGIN_MODULES: Record<string, () => Promise<unknown>> = {
  "react": () => import("react"),
  "mobx": () => import("mobx"),
  "mobx-react-lite": () => import("mobx-react-lite"),
  "date-fns": () => import("date-fns"),
  "@mui/material": () => import("@mui/material"),
  "csv": () => import("csv"),
  "react-data-grid": () => import("react-data-grid"),
  "@mui/x-date-pickers": () => import("@mui/x-date-pickers"),
  "nuclear": () => import("./PluginApi"),
};


async function importModule(module: string) {
  const loader = PLUGIN_MODULES[module];
  if (loader) {
    return await loader();
  }

  return undefined;
}


function setupPluginEnv() {
  const modules = {};
  for (const mod of Object.keys(PLUGIN_MODULES)) {
    Object.defineProperty(modules, mod, {
      get: () => PLUGIN_MODULES[mod](),
    });
  }

  (window as any).nuclear = {
    modules
  };

  (window as any).React = React;
}
