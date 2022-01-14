import { PluginLoadSpec } from "../client/plugin/PluginManager";


export interface RemotePluginSpec {
  name: string;

  url: string;

  editors: {
    [name: string]: EditorMeta
  } | undefined;
}


export interface EditorMeta {

}

