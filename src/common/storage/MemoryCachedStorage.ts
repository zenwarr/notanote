import { StorageEntryPointer, FileStats, StorageLayer, StorageEntryType, StorageError, StorageErrorCode } from "./StorageLayer";
import { StoragePath } from "./StoragePath";
import { MemoryStorage } from "../../client/storage/MemoryStorage";


/**
 * Proxies access to another storage and caches its data.
 */
export class MemoryCachedStorage extends StorageLayer {
  constructor(remoteStorage: StorageLayer) {
    super();
    this.remote = remoteStorage;
  }


  readonly remote: StorageLayer;
  readonly memory = new MemoryStorage();


  getMemoryData(path: StoragePath) {
    return this.memory.getDataAtPath(path);
  }


  override async createDir(path: StoragePath): Promise<StorageEntryPointer> {
    await this.remote.createDir(path);
    await this.memory.createDir(path);
    return new StorageEntryPointer(path, this);
  }


  override get(path: StoragePath): StorageEntryPointer {
    return new StorageEntryPointer(path, this);
  }


  override async loadAll() {
    return this.remote.loadAll();
  }


  override async children(path: StoragePath): Promise<StorageEntryPointer[]> {
    const cachedChildren = await this.memory.children(path);
    return cachedChildren.map(p => new StorageEntryPointer(path, this));
  }


  override async exists(path: StoragePath): Promise<boolean> {
    return this.memory.exists(path);
  }


  override async readText(path: StoragePath): Promise<string> {
    const cached = await this.memory.getDataAtPath(path);
    if (!cached) {
      throw new StorageError(StorageErrorCode.NotExists, path, `File does not exist`);
    }

    if (cached.stats.isDirectory) {
      throw new StorageError(StorageErrorCode.NotFile, path, `Not a file`);
    }

    if (cached.textContent == null) {
      cached.textContent = await this.remote.readText(path);
    }

    return cached.textContent;
  }


  override async remove(path: StoragePath): Promise<void> {
    await this.remote.remove(path);
    await this.memory.remove(path);
  }


  override async stats(path: StoragePath): Promise<FileStats> {
    return this.memory.stats(path);
  }


  override async writeOrCreate(path: StoragePath, content: Buffer | string): Promise<StorageEntryPointer> {
    await this.remote.writeOrCreate(path, content);
    await this.memory.writeOrCreate(path, content);
    return new StorageEntryPointer(path, this);
  }
}
