import { StorageLayer } from "../storage/StorageLayer";
import { syncEntry, SyncEntry, SyncResult } from "./StorageSync";


export interface SyncProvider {
  sync(entry: SyncEntry): Promise<SyncResult[]>;
}


export class LocalSyncProvider implements SyncProvider {
  constructor(storage: StorageLayer) {
    this.storage = storage;
  }

  private readonly storage: StorageLayer;

  async sync(entry: SyncEntry): Promise<SyncResult[]> {
    return syncEntry(entry, this.storage)
  }
}
