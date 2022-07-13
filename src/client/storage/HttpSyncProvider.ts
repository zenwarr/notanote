import ky from "ky";
import { SyncProvider } from "../../common/sync/SyncProvider";
import { SyncEntry, SyncResult } from "../../common/sync/StorageSync";


export class HttpSyncProvider implements SyncProvider {
  constructor(storageId: string) {
    this.storageId = storageId;
  }


  private readonly storageId: string;


  async sync(entry: SyncEntry): Promise<SyncResult[]> {
    return ky.post(`/api/storages/${ this.storageId }/github/init`, {
      json: {
        entry
      }
    }).json<SyncResult[]>();
  }
}
