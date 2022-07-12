import { KVStorage, SerializedKVStorageEntry } from "../storage/KVStorageLayer";


export class MapKV implements KVStorage {
  constructor(map: object | Map<string, SerializedKVStorageEntry> = {}) {
    if (map instanceof Map) {
      this._map = map;
    } else {
      this._map = new Map(Object.entries(map));
    }
  }


  private _map: Map<string, SerializedKVStorageEntry>;


  async* enumerate(): AsyncGenerator<[ string, SerializedKVStorageEntry ]> {
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


  async set(key: string, value: SerializedKVStorageEntry) {
    this._map.set(key, value);
  }
}
