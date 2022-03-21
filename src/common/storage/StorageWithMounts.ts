import { FileStats, StorageEntryPointer, StorageError, StorageErrorCode, StorageLayer } from "./StorageLayer";
import { StoragePath } from "./StoragePath";
import { walkSerializableStorageEntries } from "../workspace/SerializableStorageEntryData";


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
    return new MountableStorageEntryPointer(this, this.getPointer(path));
    ;
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


  override async loadAll() {
    const all = await this.base.loadAll();
    if (!all) {
      return undefined;
    }

    const mountParentsToChildren = new Map<string, string[]>();
    for (const mount of this.mounts.values()) {
      const mountParent = mount.path.parentDir.normalized;
      const children = mountParentsToChildren.get(mountParent) || [];
      children.push(mount.path.normalized);
      mountParentsToChildren.set(mountParent, children);
    }

    for (const entry of walkSerializableStorageEntries(all)) {
      for (const childPath of mountParentsToChildren.get(entry.path) || []) {
        const child = this.mounts.get(childPath)!;

        if (!entry.children) {
          entry.children = [];
        }

        entry.children.push({
          path: child.path.normalized,
          stats: await child.stats(),
          textContent: await child.readText()
        });
      }
    }

    return all;
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
