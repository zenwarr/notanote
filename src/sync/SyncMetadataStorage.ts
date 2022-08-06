import { StoragePath } from "@storage/StoragePath";
import { ContentIdentity } from "./ContentIdentity";
import * as _ from "lodash";


// todo: we should remove metadata for keys missing both in the local and remote storage
// because sync does not know about them
// but if another file with the same name is going to be added to local storage later, we will get incorrect sync metadata for it
export interface SyncMetadataStorage {
  get(): Promise<SyncMetadataMap>;

  set(path: StoragePath, identity: ContentIdentity | undefined): Promise<void>;

  setMulti(data: SyncMetadataMap): Promise<void>;
}


export type SyncMetadataMap = { [path: string]: ContentIdentity | undefined };


export class MemorySyncMetadataStorage implements SyncMetadataStorage {
  constructor(initial: SyncMetadataMap = {}) {
    this._data = _.cloneDeep(initial);
  }

  async get(): Promise<SyncMetadataMap> {
    return this._data;
  }


  async set(path: StoragePath, identity: ContentIdentity | undefined): Promise<void> {
    if (!identity) {
      delete this._data[path.normalized];
    }

    this._data[path.normalized] = identity;
  }


  async setMulti(data: SyncMetadataMap): Promise<void> {
    mergeMetadataMaps(this._data, data);
  }

  private _data: SyncMetadataMap = {};
}


export function mergeMetadataMaps(target: SyncMetadataMap, updated: SyncMetadataMap) {
  for (const [ key, value ] of Object.entries(updated)) {
    if (value != null) {
      target[key] = value;
    } else {
      delete target[key];
    }
  }
}
