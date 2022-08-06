import { StoragePath } from "@storage/StoragePath";
import { EntrySyncMetadata, mergeMetadataMaps, SyncMetadataMap, SyncMetadataStorage } from "@sync/SyncMetadataStorage";
import * as _ from "lodash";


export class MemorySyncMetadataStorage implements SyncMetadataStorage {
  constructor(initial: SyncMetadataMap = {}) {
    this._data = _.cloneDeep(initial);
  }


  async get(): Promise<SyncMetadataMap> {
    return this._data;
  }


  async set(path: StoragePath, meta: EntrySyncMetadata | undefined): Promise<void> {
    if (!meta) {
      delete this._data[path.normalized];
    }

    this._data[path.normalized] = meta;
  }


  async update(path: StoragePath, updater: (d: EntrySyncMetadata | undefined) => EntrySyncMetadata | undefined): Promise<void> {
    const updated = updater(this._data[path.normalized]);
    if (updated) {
      this._data[path.normalized] = updated;
    } else {
      delete this._data[path.normalized];
    }
  }


  async setMulti(data: SyncMetadataMap): Promise<void> {
    mergeMetadataMaps(this._data, data);
  }


  private _data: SyncMetadataMap = {};
}
