import { StorageError, StorageErrorCode } from "./entry-storage";
import { StoragePath } from "./storage-path";
import { MountedFile } from "./storage-with-mounts";


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


  override async read(path: StoragePath): Promise<Buffer> {
    throw new StorageError(StorageErrorCode.NotSupported, path, "Operation not supported for this entry");
  }
}
