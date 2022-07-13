import * as idb from "idb-keyval";
import { KVStorage, SerializedKVStorageEntry } from "../../common/storage/KVStorageLayer";


export class IdbKvStorage implements KVStorage {
  constructor(storeName = "fs-kv-storage") {
    this.storeName = storeName;
    this.store = idb.createStore(this.storeName, this.storeName)
  }


  private readonly storeName: string;
  private readonly store: idb.UseStore;


  async* enumerate(): AsyncGenerator<[ string, SerializedKVStorageEntry ]> {
    for (const [ key, value ] of await idb.entries(this.store)) {
      if (typeof key === "string") {
        yield [ key, value ];
      }
    }
  }


  async get(key: string): Promise<SerializedKVStorageEntry | undefined> {
    return idb.get(key, this.store);
  }


  async remove(key: string): Promise<void> {
    await idb.del(key, this.store);
  }


  async set(key: string, value: SerializedKVStorageEntry): Promise<void> {
    await idb.set(key, value, this.store);
  }
}
