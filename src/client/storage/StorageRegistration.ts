import { getPlatform, Platform } from "../platform/get-platform";
import { registerHttpStorageProvider } from "../storage-config/HttpConfigEditor";
import { registerIndexedDbStorageProvider } from "../storage-config/IndexedDbConfigEditor";


export async function registerStorageProviders() {
  registerIndexedDbStorageProvider();
  registerHttpStorageProvider();

  const platform = getPlatform();
  if (platform === Platform.Electron) {
    const { registerNodeFsStorageProvider } = await require("../storage-config/NodeFsStorageConfigEditor");
    registerNodeFsStorageProvider();
  } else if (platform === Platform.Android) {
    const { registerAndroidStorageProvider } = await require("../storage-config/AndroidStorageConfigEditor");
    registerAndroidStorageProvider();
  }
}
