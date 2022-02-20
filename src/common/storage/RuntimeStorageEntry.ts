import { StorageEntryPointer } from "./StorageLayer";
import { StoragePath } from "./StoragePath";


export abstract class RuntimeStorageEntry extends StorageEntryPointer {
  constructor(path: StoragePath) {
    super(path);
  }


  override async stats() {
    return {
      isDirectory: false,
      createTs: undefined,
      updateTs: undefined
    };
  }


  override async writeOrCreate() {
    throw new Error("Operation not supported for this entry");
  }


  override async remove() {
    throw new Error("Operation not supported for this entry");
  }


  override async children(): Promise<StorageEntryPointer[]> {
    throw new Error("Operation not supported for this entry");
  }


  override async exists(): Promise<boolean> {
    return true;
  }
}
