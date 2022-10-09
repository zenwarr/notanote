import { StorageEntryPointer, StorageEntryStats, EntryStorage, StorageError, StorageErrorCode } from "./entry-storage";
import { StoragePath } from "./storage-path";
import { MemoryStorage } from "./memory-storage";
import * as mobx from "mobx";


/**
 * Proxies access to another storage and caches its data.
 */
export class MemoryCachedStorage extends EntryStorage {
  constructor(remoteStorage: EntryStorage) {
    super();
    this.remote = remoteStorage;
    mobx.makeObservable(this, {
      memoryInited: mobx.observable,
      memoryInitError: mobx.observable
    });
  }


  async initWithRemoteOutline() {
    try {
      const treeOutline = await this.remote.loadOutline();
      if (!treeOutline) {
        throw new Error(`Failed to load storage entries: loadAll returns undefined`);
      }

      this.memory.setData(treeOutline);
      this.memoryInited = true;
    } catch (err: any) {
      this.memoryInitError = err.message || "Unknown error";
      throw err;
    }
  }


  readonly remote: EntryStorage;
  readonly memory = new MemoryStorage();
  memoryInited = false;
  memoryInitError: string | undefined = undefined;


  getMemoryData(path: StoragePath) {
    return this.memory.getDataAtPath(path);
  }


  override async createDir(path: StoragePath): Promise<void> {
    if (!this.memoryInited) {
      throw new StorageError(StorageErrorCode.NotReady, path, "Memory storage not initialized");
    }

    await this.remote.createDir(path);
    await this.memory.createDir(path);
  }


  override async loadOutline() {
    return this.remote.loadOutline();
  }


  override async children(path: StoragePath): Promise<StorageEntryPointer[]> {
    if (this.memoryInited) {
      const cachedChildren = await this.memory.children(path);
      return cachedChildren.map(p => new StorageEntryPointer(p.path, this));
    } else {
      const children = await this.remote.children(path);
      return children.map(p => new StorageEntryPointer(p.path, this));
    }
  }


  override async exists(path: StoragePath): Promise<boolean> {
    if (this.memoryInited) {
      return this.memory.exists(path);
    } else {
      return this.remote.exists(path);
    }
  }


  override async read(path: StoragePath): Promise<Buffer> {
    return this.remote.read(path);
  }


  override async remove(path: StoragePath): Promise<void> {
    if (!this.memoryInited) {
      throw new StorageError(StorageErrorCode.NotReady, path, "Memory storage not initialized");
    }

    await this.remote.remove(path);
    await this.memory.remove(path);
  }


  override async stats(path: StoragePath): Promise<StorageEntryStats> {
    if (this.memoryInited) {
      return this.memory.stats(path);
    } else {
      return this.remote.stats(path);
    }
  }


  override async writeOrCreate(path: StoragePath, content: Buffer): Promise<void> {
    await this.remote.writeOrCreate(path, content);
  }
}
