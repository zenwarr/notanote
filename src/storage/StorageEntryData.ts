import { StorageEntryStats } from "@storage/EntryStorage";
import { StoragePath } from "@storage/StoragePath";


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
