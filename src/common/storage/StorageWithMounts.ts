import { StorageEntryPointer, FileStats, StorageError, StorageErrorCode, StorageLayer } from "./StorageLayer";
import { StoragePath } from "./StoragePath";


export class StorageWithMounts extends StorageLayer {
  constructor(base: StorageLayer) {
    super();
    this.base = base;
  }


  private readonly base: StorageLayer;


  override async createDir(path: StoragePath): Promise<StorageEntryPointer> {
    if (this.mounts.has(path.normalized)) {
      throw new StorageError(StorageErrorCode.AlreadyExists, path, "Storage entry already exists");
    }

    let parent = path.parentDir;
    do {
      if (this.mounts.has(parent.normalized)) {
        throw new StorageError(StorageErrorCode.InvalidStructure, path, "Storage entry already exists");
      }
      parent = parent.parentDir;
    } while (!parent.isEqual(StoragePath.root));

    const createdDir = await this.base.createDir(path);
    return new MountableStorageEntryPointer(this, createdDir);
  }


  override get(path: StoragePath): StorageEntryPointer {
    return new MountableStorageEntryPointer(this, this.getPointer(path));;
  }


  mount(entry: StorageEntryPointer) {
    const normalized = entry.path.normalized;
    if (this.mounts.has(normalized)) {
      throw new Error(`Path '${ normalized }' is already mounted`);
    }

    this.mounts.set(normalized, entry);
  }


  getMountedChildren(path: StoragePath): StorageEntryPointer[] {
    const result: StorageEntryPointer[] = [];
    for (const [ key, value ] of Object.entries(this.mounts)) {
      const mountedPath = new StoragePath(key);
      if (mountedPath.parentDir === path) {
        result.push(value);
      }
    }

    return result;
  }


  private getPointer(path: StoragePath): StorageEntryPointer {
    const mounted = this.mounts.get(path.normalized);
    if (mounted) {
      return mounted;
    } else {
      return this.base.get(path);
    }
  }


  private mounts = new Map<string, StorageEntryPointer>();
}


export class MountableStorageEntryPointer extends StorageEntryPointer {
  constructor(storage: StorageWithMounts, entry: StorageEntryPointer) {
    super(entry.path);
    this.storage = storage;
    this.entry = entry;
  }


  private readonly storage: StorageWithMounts;
  private readonly entry: StorageEntryPointer;


  override async children(): Promise<StorageEntryPointer[]> {
    const mountedChildren = this.storage.getMountedChildren(this.path);
    const children = await this.entry.children();
    return [ ...mountedChildren, ...children ];
  }


  override async exists(): Promise<boolean> {
    return this.entry.exists();
  }


  override async readText(): Promise<string> {
    return this.entry.readText();
  }


  override async remove(): Promise<void> {
    await this.entry.remove();
  }


  override async stats(): Promise<FileStats> {
    return this.entry.stats();
  }


  override async writeOrCreate(content: Buffer | string): Promise<void> {
    await this.entry.writeOrCreate(content);
  }
}
