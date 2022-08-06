import { StoragePath } from "@storage/StoragePath";
import { ContentIdentity } from "@sync/ContentIdentity";
import { EntrySyncMetadata, mergeMetadataMaps, SyncMetadataMap, SyncMetadataStorage } from "@sync/SyncMetadataStorage";
import { ClientKeyValueStore } from "./ClientKeyValueStore";


const SYNC_METADATA_KEY = "sync-metadata";


export class BrowserSyncMetadataStorage implements SyncMetadataStorage {
  async get() {
    return await this.loadStoredData();
  }


  async set(path: StoragePath, meta: EntrySyncMetadata | undefined) {
    const data = await this.loadStoredData();
    if (!meta) {
      delete data[path.normalized];
    } else {
      data[path.normalized] = meta;
    }

    await ClientKeyValueStore.defaultInstance.set(SYNC_METADATA_KEY, data);
  }


  async update(path: StoragePath, updater: (d: EntrySyncMetadata | undefined) => EntrySyncMetadata | undefined) {
    const data = await this.loadStoredData();

    const updated = updater(data[path.normalized]);
    if (updated) {
      data[path.normalized] = updated;
    } else {
      delete data[path.normalized];
    }

    await ClientKeyValueStore.defaultInstance.set(SYNC_METADATA_KEY, data);
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
