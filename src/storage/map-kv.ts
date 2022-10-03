import { KVStorage, KVStorageEntry } from "./kv-entry-storage";


export class MapKV implements KVStorage {
  constructor(map: { [path: string]: KVStorageEntry } | Map<string, KVStorageEntry> = {}) {
    if (map instanceof Map) {
      this._map = map;
    } else {
      this._map = new Map(Object.entries(map));
    }
  }


  private _map: Map<string, KVStorageEntry>;


  async* enumerate(): AsyncGenerator<[ string, KVStorageEntry ]> {
    for (const [ key, value ] of this._map.entries()) {
      yield [ key, value ];
    }
  }


  async get(key: string) {
    return this._map.get(key);
  }


  async remove(key: string) {
    this._map.delete(key);
  }


  async set(key: string, value: KVStorageEntry) {
    this._map.set(key, value);
  }
}
