import { StoragePath } from "@storage/StoragePath";
import { ContentIdentity } from "@sync/ContentIdentity";
import { mergeMetadataMaps, SyncMetadataMap, SyncMetadataStorage } from "@sync/SyncMetadataStorage";
import { ClientKeyValueStore } from "../keyValueStore/ClientKeyValueStore";


const SYNC_METADATA_KEY = "sync-metadata";


export class BrowserSyncMetadataStorage implements SyncMetadataStorage {
  async get() {
    return await this.loadStoredData();
  }


  async set(path: StoragePath, identity: ContentIdentity) {
    (await this.loadStoredData())[path.normalized] = identity;
    await ClientKeyValueStore.defaultInstance.set(SYNC_METADATA_KEY, this._data);
  }


  async setMulti(data: SyncMetadataMap): Promise<void> {
    await this.loadStoredData();
    mergeMetadataMaps(this._data!, data);
    await ClientKeyValueStore.defaultInstance.set(SYNC_METADATA_KEY, this._data);
  }


  private async loadStoredData(): Promise<SyncMetadataMap> {
    if (this._data == null) {
      this._data = await ClientKeyValueStore.defaultInstance.get<SyncMetadataMap>(SYNC_METADATA_KEY) || {};
    }

    return this._data;
  }


  private _data: SyncMetadataMap | undefined = undefined;
}
