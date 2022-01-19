import { StorageEntry } from "./StorageLayer";
import { StoragePath } from "./StoragePath";


export abstract class RuntimeStorageEntry extends StorageEntry {
  constructor(private readonly _path: StoragePath) {
    super();
  }


  override flags(): number {
    return 0;
  }


  override getPath() {
    return this._path;
  }


  override async stats() {
    return {
      isDirectory: false,
      createTs: undefined,
      updateTs: undefined
    };
  }


  override async write() {
    throw new Error("Operation not supported for this entry");
  }
}
