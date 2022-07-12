import { walkSerializableStorageEntries } from "../workspace/SerializableStorageEntryData";
import { FileStats, StorageEntryPointer, StorageError, StorageErrorCode, StorageLayer } from "./StorageLayer";
import { StoragePath } from "./StoragePath";


export abstract class MountedFile {
  abstract readText(path: StoragePath): Promise<string>;

  abstract stats(path: StoragePath): Promise<FileStats>;

  abstract write(path: StoragePath, content: Buffer | string): Promise<void>;
}


/**
 * Enriches a storage layer with a set of mounted files.
 * We support mounting files only, not directories.
 */
export class StorageWithMounts extends StorageLayer {
  constructor(base: StorageLayer) {
    super();
    this.base = base;
  }


  private readonly base: StorageLayer;
  private mounts = new Map<string, MountedFile>();


  override async createDir(path: StoragePath): Promise<StorageEntryPointer> {
    if (this.mounts.has(path.normalized)) {
      throw new StorageError(StorageErrorCode.AlreadyExists, path, "Storage entry already exists");
    }

    await this.base.createDir(path);
    return new StorageEntryPointer(path, this);
  }


  override get(path: StoragePath): StorageEntryPointer {
    return new StorageEntryPointer(path, this);
  }


  mount(path: StoragePath, mountedFile: MountedFile) {
    const normalized = path.normalized;
    if (this.mounts.has(normalized)) {
      throw new Error(`Path '${ normalized }' is already mounted`);
    }

    this.mounts.set(normalized, mountedFile);
  }


  override async loadAll() {
    const all = await this.base.loadAll();
    if (!all) {
      return undefined;
    }

    const mountParentsToChildren = new Map<string, string[]>();
    for (const [ mountPath, mount ] of this.mounts.entries()) {
      const mountParentPath = new StoragePath(mountPath).parentDir.normalized;
      const children = mountParentsToChildren.get(mountParentPath) || [];
      children.push(mountPath);
      mountParentsToChildren.set(mountParentPath, children);
    }

    for (const entry of walkSerializableStorageEntries(all)) {
      for (const childPath of mountParentsToChildren.get(entry.path) || []) {
        const child = this.mounts.get(childPath)!;

        if (!entry.children) {
          entry.children = [];
        }

        entry.children.push({
          path: childPath,
          stats: await child.stats(new StoragePath(childPath)),
          textContent: await child.readText(new StoragePath(childPath))
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


  override async readText(path: StoragePath): Promise<string> {
    const mounted = this.mounts.get(path.normalized);
    if (mounted) {
      return mounted.readText(path);
    }

    return this.base.readText(path);
  }


  override async remove(path: StoragePath): Promise<void> {
    const mounted = this.mounts.get(path.normalized);
    if (mounted) {
      throw new StorageError(StorageErrorCode.NoPermissions, path, "Cannot remove mounted file");
    }

    return this.base.remove(path);
  }


  override async stats(path: StoragePath): Promise<FileStats> {
    const mounted = this.mounts.get(path.normalized);
    if (mounted) {
      return mounted.stats(path);
    }

    return this.base.stats(path);
  }


  override async writeOrCreate(path: StoragePath, content: Buffer | string): Promise<StorageEntryPointer> {
    const mounted = this.mounts.get(path.normalized);
    if (mounted) {
      await mounted.write(path, content);
    }

    return this.base.writeOrCreate(path, content);
  }
}
