import { getWorkspacePlugins } from "../plugin/PluginManager";
import { getRemoteOrigin } from "../github/Github";
import path from "path";
import { Workspace } from "../../common/storage/Workspace";
import { RuntimeStorageEntry } from "../../common/storage/RuntimeStorageEntry";
import { StoragePath } from "../../common/storage/StoragePath";


export class PluginConfigStorageEntry extends RuntimeStorageEntry {
  constructor(private readonly ws: Workspace, path: StoragePath) {
    super(path);
  }


  override async readText(): Promise<string> {
    const plugins = await getWorkspacePlugins(this.ws.id, this.ws.root);

    const result: any[] = [];
    for (const plugin of plugins) {
      result.push({
        name: plugin.name,
        gitCloneUrl: await getRemoteOrigin(path.join(this.ws.root, ".note/plugins/" + plugin.name)),
      });
    }

    return JSON.stringify({
      plugins: result
    });
  }
}
