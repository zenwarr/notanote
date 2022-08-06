import { uint8ArrayToBuffer } from "@common/utils/uint8ArrayToBuffer";
import { KVStorage, KVStorageEntry } from "@storage/KVStorageLayer";
import { ClientKeyValueStore } from "./ClientKeyValueStore";


export const DEFAULT_FS_IDB_DATABASE = "fs-kv-storage";
const KV_STORE_NAME = "kv";


export class IdbKvStorage implements KVStorage {
  constructor(dbName = DEFAULT_FS_IDB_DATABASE) {
    this.store = new ClientKeyValueStore(dbName, KV_STORE_NAME);
  }


  readonly store: ClientKeyValueStore;


  async* enumerate(): AsyncGenerator<[ string, KVStorageEntry ]> {
    for await (const [ key, storedEntry ] of this.store.enumerate()) {
      yield [ key, this.storedEntryToKVStorageEntry(storedEntry)! ];
    }
  }


  async get(key: string): Promise<KVStorageEntry | undefined> {
    const d = await this.store.get<any>(key);
    return this.storedEntryToKVStorageEntry(d);
  }


  async remove(key: string): Promise<void> {
    return this.store.remove(key);
  }


  async set(key: string, value: KVStorageEntry): Promise<void> {
    return this.store.set(key, value);
  }


  private storedEntryToKVStorageEntry(storedEntry: any): KVStorageEntry | undefined {
    if (!storedEntry) {
      return undefined;
    }

    return {
      ...storedEntry,
      data: storedEntry.data ? uint8ArrayToBuffer(storedEntry.data) : undefined,
    };
  }
}
