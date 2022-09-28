import { getPlatform, Platform } from "../platform/getPlatform";
import { registerHttpStorageProvider } from "../storage-config/HttpConfigEditor";
import { registerIndexedDbStorageProvider } from "../storage-config/IndexedDbConfigEditor";


export async function registerStorageProviders() {
  registerIndexedDbStorageProvider();
  registerHttpStorageProvider();

  const platform = getPlatform();
  if (platform === Platform.Electron) {
    const { registerNodeFsStorageProvider } = await require("../storage-config/NodeFsStorageConfigEditor")
    registerNodeFsStorageProvider();
  }
}
