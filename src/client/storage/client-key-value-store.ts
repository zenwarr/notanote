import * as idb from "idb";


const KV_DB_NAME = "kv";
const KV_STORE_NAME = "kv";


export class ClientKeyValueStore {
  constructor(dbName: string, storeName: string = KV_STORE_NAME) {
    this.dbName = dbName;
    this.storeName = storeName;
  }


  private readonly dbName: string;
  private readonly storeName: string;


  private async lazyInit(): Promise<idb.IDBPDatabase> {
    if (!this.store) {
      this.store = await idb.openDB(this.dbName, 1, {
        upgrade: db => db.createObjectStore(this.storeName)
      });
    }

    return this.store;
  }


  async get<T = unknown>(key: string): Promise<T | undefined> {
    return (await this.lazyInit()).get(this.storeName, key);
  }


  async remove(key: string): Promise<void> {
    await (await this.lazyInit()).delete(this.storeName, key);
  }


  async set(key: string, value: unknown): Promise<void> {
    await (await this.lazyInit()).put(this.storeName, value, key);
  }


  async* enumerate(): AsyncGenerator<[ string, unknown ]> {
    const store = await this.lazyInit();
    for (const [ _, key ] of Object.entries(await store.getAllKeys(this.storeName))) {
      if (typeof key === "string") {
        yield [ key, await this.get(key) ];
      }
    }
  }


  private store: idb.IDBPDatabase | undefined;


  static get defaultInstance() {
    if (!this._defaultInstance) {
      this._defaultInstance = new ClientKeyValueStore(KV_DB_NAME, KV_STORE_NAME);
    }

    return this._defaultInstance;
  }


  private static _defaultInstance: ClientKeyValueStore | undefined;
}
