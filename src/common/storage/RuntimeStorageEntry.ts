import { StorageError, StorageErrorCode } from "./StorageLayer";
import { StoragePath } from "./StoragePath";
import { MountedFile } from "./StorageWithMounts";


export abstract class RuntimeStorageEntry extends MountedFile {
  override async stats(path: StoragePath) {
    return {
      isDirectory: false,
      size: undefined,
      createTs: undefined,
      updateTs: undefined
    };
  }


  override async write(path: StoragePath, content: Buffer | string) {
    throw new StorageError(StorageErrorCode.NotSupported, path, "Operation not supported for this entry");
  }


  override async readText(path: StoragePath): Promise<string> {
    throw new StorageError(StorageErrorCode.NotSupported, path, "Operation not supported for this entry");
  }
}
