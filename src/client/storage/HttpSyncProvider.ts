import ky from "ky";
import { serializeSyncEntry, SyncEntry } from "@sync/SyncEntry";
import { SyncProvider } from "@sync/SyncProvider";
import { SyncResult } from "@sync/RemoteSync";


export class HttpSyncProvider implements SyncProvider {
  constructor(storageId: string) {
    this.storageId = storageId;
  }


  private readonly storageId: string;


  async sync(entry: SyncEntry): Promise<SyncResult[]> {
    return ky.post(`/api/storages/${ this.storageId }/sync`, {
      json: {
        entry: serializeSyncEntry(entry)
      }
    }).json<SyncResult[]>();
  }
}
