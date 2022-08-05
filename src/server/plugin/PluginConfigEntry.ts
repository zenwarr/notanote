import { getWorkspacePlugins } from "./PluginManager";
import { getRemoteOrigin } from "../github/Github";
import path from "path";
import { RuntimeStorageEntry } from "@storage/RuntimeStorageEntry";


export class PluginConfigStorageEntry extends RuntimeStorageEntry {
  constructor(wsId: string, private readonly realRootPath: string) {
    super();
    this.wsId = wsId;
  }


  private readonly wsId: string;


  override async read(): Promise<Buffer> {
    const plugins = await getWorkspacePlugins(this.wsId, this.realRootPath);

    const result: any[] = [];
    for (const plugin of plugins) {
      result.push({
        name: plugin.name,
        gitCloneUrl: await getRemoteOrigin(path.join(this.realRootPath, ".note/plugins/" + plugin.name)),
      });
    }

    const data = JSON.stringify({
      plugins: result
    });

    return Buffer.from(data);
  }
}
