import * as React from "react";
import { Document, DocumentEditorStateAdapter } from "../Document";
import * as nanoid from "nanoid";


export interface EditorProps {
  doc: Document;
  className?: string;
}


export interface EditorMeta {

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
  async getEditor(name: string) {
    const editorPlugin = await this.loadPluginForEditor(name);
    if (editorPlugin) {
      return editorPlugin.editors[name];
    } else {
      return undefined;
    }
  }

  registerPlugin(plugin: PluginMeta) {
    if (this.plugins.some(x => x.name === plugin.name)) {
      throw new Error(`Cannot register plugin ${plugin.name}: another plugin with this name already exists`)
    }

    this.plugins.push(plugin)
  }

  getPlugins() {
    return this.plugins;
  }

  protected async loadPluginForEditor(name: string): Promise<LoadedPlugin | undefined> {
    for (const plugin of this.plugins) {
      if (plugin.editors && Object.keys(plugin.editors).includes(name)) {
        return this.loadPlugin(plugin.load);
      }
    }

    return undefined;
  }

  protected async loadPlugin(loadSpec: PluginLoadSpec): Promise<LoadedPlugin> {
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
      const exportName = nanoid.nanoid();
      script.dataset.export = exportName;
      script.onload = () => {
        const loadedPlugin = (window as any)[exportName];
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
  }
}
