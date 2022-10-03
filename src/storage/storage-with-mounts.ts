import { walkStorageEntryData } from "@storage/storage-entry-data";
import { StorageEntryStats, StorageEntryPointer, StorageError, StorageErrorCode, EntryStorage } from "./entry-storage";
import { StoragePath } from "./storage-path";


export abstract class MountedFile {
  abstract read(path: StoragePath): Promise<Buffer>;

  abstract stats(path: StoragePath): Promise<StorageEntryStats>;

  abstract write(path: StoragePath, content: Buffer): Promise<void>;
}


/**
 * Enriches a storage with a set of mounted files.
 * We support mounting files only, not directories.
 */
export class StorageWithMounts extends EntryStorage {
  constructor(base: EntryStorage) {
    super();
    this.base = base;
  }


  private readonly base: EntryStorage;
  private mounts = new Map<string, MountedFile>();


  override async createDir(path: StoragePath): Promise<void> {
    if (this.mounts.has(path.normalized)) {
      throw new StorageError(StorageErrorCode.AlreadyExists, path, "Storage entry already exists");
    }

    await this.base.createDir(path);
  }


  mount(path: StoragePath, mountedFile: MountedFile) {
    const normalized = path.normalized;
    if (this.mounts.has(normalized)) {
      throw new Error(`Path '${ normalized }' is already mounted`);
    }

    this.mounts.set(normalized, mountedFile);
  }


  override async loadOutline() {
    const all = await this.base.loadOutline();

    const mountParentsToChildren = new Map<string, string[]>();
    for (const [ mountPath, mount ] of this.mounts.entries()) {
      const mountParentPath = new StoragePath(mountPath).parentDir.normalized;
      const children = mountParentsToChildren.get(mountParentPath) || [];
      children.push(mountPath);
      mountParentsToChildren.set(mountParentPath, children);
    }

    for (const entry of walkStorageEntryData(all)) {
      for (const childPath of mountParentsToChildren.get(entry.path.normalized) || []) {
        const child = this.mounts.get(childPath)!;

        if (!entry.children) {
          entry.children = [];
        }

        entry.children.push({
          path: new StoragePath(childPath),
          stats: await child.stats(new StoragePath(childPath)),
          content: await child.read(new StoragePath(childPath))
        });
      }
    }

    return all;
  }


  override async children(path: StoragePath): Promise<StorageEntryPointer[]> {
    const mountedChildren: StorageEntryPointer[] = [];
    for (const [ key, value ] of Object.entries(this.mounts)) {
      const mountedPath = new StoragePath(key);
      if (mountedPath.parentDir === path) {
        mountedChildren.push(new StorageEntryPointer(mountedPath, this));
      }
    }

    const children = await this.base.children(path);
    return [ ...children, ...mountedChildren ];
  }


  override async exists(path: StoragePath): Promise<boolean> {
    if (this.mounts.has(path.normalized)) {
      return true;
    }

    return this.base.exists(path);
  }


  override async read(path: StoragePath): Promise<Buffer> {
    const mounted = this.mounts.get(path.normalized);
    if (mounted) {
      return mounted.read(path);
    }

    return this.base.read(path);
  }


  override async remove(path: StoragePath): Promise<void> {
    const mounted = this.mounts.get(path.normalized);
    if (mounted) {
      throw new StorageError(StorageErrorCode.NoPermissions, path, "Cannot remove mounted file");
    }

    return this.base.remove(path);
  }


  override async stats(path: StoragePath): Promise<StorageEntryStats> {
    const mounted = this.mounts.get(path.normalized);
    if (mounted) {
      return mounted.stats(path);
    }

    return this.base.stats(path);
  }


  override async writeOrCreate(path: StoragePath, content: Buffer): Promise<void> {
    const mounted = this.mounts.get(path.normalized);
    if (mounted) {
      await mounted.write(path, content);
    }

    await this.base.writeOrCreate(path, content);
  }
}
