import * as React from "react";
import { Document, DocumentEditorStateAdapter } from "../Document";
import { setupPluginDeps } from "./SetupPluginDeps";
import { EditorMeta } from "../../common/plugin";


export interface EditorProps {
  doc: Document;
  className?: string;
}


export type PluginLoadSpec = string | (new () => LoadedPlugin);


export interface PluginMeta {
  name: string;

  /**
   * If string, loads plugin from given relative URL path.
   * If class, this plugin is built-in and loads from given class.
   */
  load: PluginLoadSpec;

  editors: {
    [name: string]: EditorMeta
  } | undefined;
}


export class PluginManager {
  constructor() {
    setupPluginDeps();
  }


  async getCustomEditorForDocument(doc: Document) {
    const editorName = doc.settings.editor?.name;
    if (!editorName) {
      return undefined;
    }

    const editorPlugin = await this.loadPluginForEditor(editorName);
    if (editorPlugin) {
      return editorPlugin.editors[editorName];
    } else {
      return undefined;
    }
  }


  registerPlugin(plugin: PluginMeta) {
    if (this.plugins.some(x => x.name === plugin.name)) {
      throw new Error(`Cannot register plugin ${ plugin.name }: another plugin with this name already exists`);
    }

    this.plugins.push(plugin);
  }


  getPlugins() {
    return this.plugins;
  }


  protected async loadPluginForEditor(name: string): Promise<LoadedPlugin | undefined> {
    for (const plugin of this.plugins) {
      if (plugin.editors && Object.keys(plugin.editors).includes(name)) {
        return this.loadPlugin(plugin.name, plugin.load);
      }
    }

    return undefined;
  }


  protected async loadPlugin(name: string, loadSpec: PluginLoadSpec): Promise<LoadedPlugin> {
    const cached = this.loadedPlugins.get(loadSpec);
    if (cached != null) {
      return cached;
    }

    if (typeof loadSpec === "function") {
      const plugin = new loadSpec();
      this.loadedPlugins.set(loadSpec, plugin);
      return plugin;
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = loadSpec;
      script.onload = () => {
        const loadedPlugin = (window as any)[`plugin_${ name }`];
        if (!loadedPlugin) {
          reject(new Error("Cannot load plugin: something went wrong during load, no export found"));
        } else {
          this.loadedPlugins.set(loadSpec, loadedPlugin);
          resolve(loadedPlugin);
        }
      };
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }


  private readonly plugins: PluginMeta[] = [];
  private readonly loadedPlugins = new Map<PluginLoadSpec, LoadedPlugin>();
  public static readonly instance = new PluginManager();
}


export interface LoadedPlugin {
  editors: {
    [name: string]: {
      component: React.ComponentType<EditorProps>
      stateAdapter: new (doc: Document) => DocumentEditorStateAdapter;
    }
  };
}
