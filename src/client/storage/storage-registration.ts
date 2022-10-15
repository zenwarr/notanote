import { getPlatform, Platform } from "../platform/get-platform";
import { registerHttpStorageProvider } from "../storage-config/http-config-editor";
import { registerIndexedDbStorageProvider } from "../storage-config/indexeddb-config-editor";


export async function registerStorageProviders() {
  registerIndexedDbStorageProvider();
  registerHttpStorageProvider();

  const platform = getPlatform();
  if (platform === Platform.Electron) {
    const { registerNodeFsStorageProvider } = await require("../storage-config/node-fs-storage-config-editor");
    registerNodeFsStorageProvider();
  } else if (platform === Platform.Android) {
    const { registerAndroidStorageProvider } = await require("../storage-config/android-storage-config-editor");
    registerAndroidStorageProvider();
  }
}
