import * as idb from "idb-keyval";
import { StoragePath } from "../../common/storage/StoragePath";
import { ContentIdentity } from "../../common/sync/ContentIdentity";
import { mergeMetadataMaps, SyncMetadataMap, SyncMetadataStorage } from "../../common/sync/SyncMetadataStorage";


export class BrowserSyncMetadataStorage implements SyncMetadataStorage {
  async get() {
    return await this.loadStoredData();
  }


  async set(path: StoragePath, identity: ContentIdentity) {
    (await this.loadStoredData())[path.normalized] = identity;
    await idb.set("sync-metadata", this._data);
  }


  async setMulti(data: SyncMetadataMap): Promise<void> {
    await this.loadStoredData();
    mergeMetadataMaps(this._data!, data);
    await idb.set("sync-metadata", this._data);
  }


  private async loadStoredData(): Promise<SyncMetadataMap> {
    if (this._data == null) {
      this._data = await idb.get<SyncMetadataMap>("sync-metadata") || {};
    }

    return this._data;
  }


  private _data: SyncMetadataMap | undefined = undefined;
}
