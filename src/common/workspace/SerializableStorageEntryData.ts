import { FileStats } from "../storage/StorageLayer";


export interface SerializableStorageEntryData {
  path: string;
  stats: FileStats;
  children?: SerializableStorageEntryData[];
  textContent?: string;
  checksum?: string;
}
