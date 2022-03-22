import { StorageLayer } from "../storage/StorageLayer";
import { StoragePath } from "../storage/StoragePath";


export namespace SpecialWorkspaceEntry {
  export const SpecialRoot = new StoragePath(".note");
  export const Secrets = new StoragePath(".note/secrets");
  export const PluginConfig = new StoragePath(".note/plugins.json");
  export const DeviceConfig = new StoragePath(".note/device.json");
  export const Plugins = new StoragePath(".note/plugins");
  export const Settings = new StoragePath(".note/settings.json");
}


export async function createWorkspaceDefaults(fs: StorageLayer) {
  await fs.createDir(SpecialWorkspaceEntry.SpecialRoot);
  await fs.get(SpecialWorkspaceEntry.Settings).writeOrCreate("{\n  \n}");
}
