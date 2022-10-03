import { StorageEntryStats } from "@storage/entry-storage";
import { StoragePath } from "@storage/storage-path";


export interface StorageEntryData {
  path: StoragePath;
  stats: StorageEntryStats;
  children?: StorageEntryData[];
  content?: Buffer;
}



export function *walkStorageEntryData(d: StorageEntryData): Generator<StorageEntryData> {
  yield d;

  if (d.children) {
    for (const child of d.children) {
      yield *walkStorageEntryData(child);
    }
  }
}
