import { StorageEntryPointer, StorageEntryStats, EntryStorage, StorageError, StorageErrorCode } from "./EntryStorage";
import { StoragePath } from "./StoragePath";
import { MemoryStorage } from "./MemoryStorage";


/**
 * Proxies access to another storage and caches its data.
 */
export class MemoryCachedStorage extends EntryStorage {
  constructor(remoteStorage: EntryStorage) {
    super();
    this.remote = remoteStorage;
  }


  async initWithRemoteOutline() {
    const treeOutline = await this.remote.loadOutline();
    if (!treeOutline) {
      throw new Error(`Failed to load storage entries: loadAll returns undefined`);
    }

    this.memory.setData(treeOutline);
  }


  readonly remote: EntryStorage;
  readonly memory = new MemoryStorage();


  getMemoryData(path: StoragePath) {
    return this.memory.getDataAtPath(path);
  }


  override async createDir(path: StoragePath): Promise<void> {
    await this.remote.createDir(path);
    await this.memory.createDir(path);
  }


  override async loadOutline() {
    return this.remote.loadOutline();
  }


  override async children(path: StoragePath): Promise<StorageEntryPointer[]> {
    const cachedChildren = await this.memory.children(path);
    return cachedChildren.map(p => new StorageEntryPointer(p.path, this));
  }


  override async exists(path: StoragePath): Promise<boolean> {
    return this.memory.exists(path);
  }


  override async read(path: StoragePath): Promise<Buffer> {
    const cached = await this.memory.getDataAtPath(path);
    if (!cached) {
      throw new StorageError(StorageErrorCode.NotExists, path, `File does not exist`);
    }

    if (cached.stats.isDirectory) {
      throw new StorageError(StorageErrorCode.NotFile, path, `Not a file`);
    }

    if (cached.content == null) {
      cached.content = await this.remote.read(path);
    }

    return cached.content;
  }


  override async remove(path: StoragePath): Promise<void> {
    await this.remote.remove(path);
    await this.memory.remove(path);
  }


  override async stats(path: StoragePath): Promise<StorageEntryStats> {
    return this.memory.stats(path);
  }


  override async writeOrCreate(path: StoragePath, content: Buffer): Promise<void> {
    await this.remote.writeOrCreate(path, content);
    await this.memory.writeOrCreate(path, content);
  }
}
