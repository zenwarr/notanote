import { StorageEntryPointer, FileStats, StorageLayer, StorageEntryType } from "./StorageLayer";
import { StoragePath } from "./StoragePath";
import { MemoryStorageEntryPointer, MemoryStorage } from "../../client/storage/MemoryStorage";


export class MemoryCachedStorage extends StorageLayer {
  constructor(remoteStorage: StorageLayer) {
    super();
    this.remote = remoteStorage;
  }


  readonly remote: StorageLayer;
  readonly memory = new MemoryStorage();


  override async createDir(path: StoragePath): Promise<MemoryCachedEntryPointer> {
    await this.remote.createDir(path);
    const created = await this.memory.createDir(path);
    return new MemoryCachedEntryPointer(created, this);
  }


  override get(path: StoragePath): MemoryCachedEntryPointer {
    return new MemoryCachedEntryPointer(this.memory.get(path), this);
  }


  override async loadAll() {
    return this.remote.loadAll();
  }
}


export class MemoryCachedEntryPointer extends StorageEntryPointer {
  constructor(memory: MemoryStorageEntryPointer, storage: MemoryCachedStorage) {
    super(memory.path);
    this.memory = memory;
    this.storage = storage;
  }


  readonly memory: MemoryStorageEntryPointer;
  readonly storage: MemoryCachedStorage;


  override async children(): Promise<StorageEntryPointer[]> {
    return (await this.memory.children()).map(p => new MemoryCachedEntryPointer(p, this.storage));
  }


  override async exists(): Promise<boolean> {
    return this.memory.exists();
  }


  override async readText(): Promise<string> {
    if (this.memory.content == null && this.memory.type === StorageEntryType.File) {
      const remoteEntry = this.storage.remote.get(this.path);
      this.memory.content = await remoteEntry.readText();
    }

    return this.memory.readText();
  }


  override async remove(): Promise<void> {
    const remoteEntry = await this.storage.remote.get(this.path);
    await remoteEntry.remove();
    await this.memory.remove();
  }


  override async stats(): Promise<FileStats> {
    return this.memory.stats();
  }


  override async writeOrCreate(content: Buffer | string): Promise<void> {
    const remoteEntry = await this.storage.remote.get(this.path);
    await remoteEntry.writeOrCreate(content);
    await this.memory.writeOrCreate(content);
  }
}
