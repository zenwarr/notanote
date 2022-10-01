import { AndroidFileStorage } from "../storage/AndroidFileStorage";
import { useCallback } from "react";
import * as React from "react";
import { StorageProviderConfigEditorProps, StorageProviderManager } from "../storage/StorageProvider";
import { useLoad } from "../useLoad";
import { LoadGuard } from "../utils/LoadGuard";


interface AndroidStorageConfig {

}


export function AndroidStorageConfigEditor(props: StorageProviderConfigEditorProps<AndroidStorageConfig>) {
  const dir = useLoad(useCallback(() => {
    return AndroidFileStorage.getStorageDir();
  }, []))

  return <LoadGuard loadState={ dir }>
    {
      dir => <>Files will be stored in the directory { dir }</>
    }
  </LoadGuard>
}


export function registerAndroidStorageProvider() {
  StorageProviderManager.instance.registerProvider<AndroidStorageConfig>({
    name: "android",
    title: "File system",
    storageFactory: c => new AndroidFileStorage(),
    configEditor: AndroidStorageConfigEditor,
    validateOptions: async (options: any) => {
      return undefined;
    }
  });
}
