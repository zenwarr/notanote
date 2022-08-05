import { StorageLayer } from "@storage/StorageLayer";
import { syncRemoteEntry, SyncResult } from "./RemoteSync";
import { SyncEntry } from "./SyncEntry";


export interface SyncProvider {
  sync(entry: SyncEntry): Promise<SyncResult[]>;
}


export class LocalSyncProvider implements SyncProvider {
  constructor(storage: StorageLayer) {
    this.storage = storage;
  }

  private readonly storage: StorageLayer;

  async sync(entry: SyncEntry): Promise<SyncResult[]> {
    return syncRemoteEntry(entry, this.storage)
  }
}
