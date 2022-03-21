import { FileStats } from "../storage/StorageLayer";


export interface SerializableStorageEntryData {
  path: string;
  stats: FileStats;
  children?: SerializableStorageEntryData[];
  textContent?: string;
  checksum?: string;
}



export function *walkSerializableStorageEntries(d: SerializableStorageEntryData): Generator<SerializableStorageEntryData> {
  yield d;

  if (d.children) {
    for (const child of d.children) {
      yield *walkSerializableStorageEntries(child);
    }
  }
}
