import { getWorkspacePlugins } from "./PluginManager";
import { getRemoteOrigin } from "../github/Github";
import path from "path";
import { RuntimeStorageEntry } from "../../common/storage/RuntimeStorageEntry";
import { StoragePath } from "../../common/storage/StoragePath";


export class PluginConfigStorageEntry extends RuntimeStorageEntry {
  constructor(private readonly wsId: string, private readonly realRootPath: string) {
    super();
  }


  override async readText(): Promise<string> {
    const plugins = await getWorkspacePlugins(this.wsId, this.realRootPath);

    const result: any[] = [];
    for (const plugin of plugins) {
      result.push({
        name: plugin.name,
        gitCloneUrl: await getRemoteOrigin(path.join(this.realRootPath, ".note/plugins/" + plugin.name)),
      });
    }

    return JSON.stringify({
      plugins: result
    });
  }
}
