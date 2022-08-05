import ky from "ky";
import { timeout } from "@common/utils/timeout";


export class PluginBackend {
  async clone(workspaceId: string, name: string, url: string): Promise<void> {
    await ky.post(`/api/storages/${ encodeURIComponent(workspaceId) }/plugins`, {
      json: {
        name, url
      }
    });
  }


  async update(workspaceId: string, pluginId: string): Promise<void> {
    await ky.post(`/api/storages/${ encodeURIComponent(workspaceId) }/plugins/${pluginId}/update`);
  }
}


export class TestPluginBackend {
  async clone(workspaceId: string, name: string, url: string): Promise<void> {
    await timeout(3000);
    console.log("clone plugin");
  }

  async update(workspaceId: string, pluginId: string): Promise<void> {
    await timeout(3000);
    console.log("update plugin");
  }
}
