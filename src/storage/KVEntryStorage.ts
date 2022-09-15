import { StorageEntryStats, StorageEntryPointer, StorageEntryType, StorageError, StorageErrorCode, EntryStorage } from "./EntryStorage";
import { StoragePath } from "./StoragePath";


export interface KVStorageEntry {
  type: StorageEntryType;
  createTs?: number;
  updateTs?: number;
  data?: Buffer;
}


export interface KVStorage {
  get(key: string): Promise<KVStorageEntry | undefined>;

  set(key: string, value: KVStorageEntry): Promise<void>;

  remove(key: string): Promise<void>;

  enumerate(): AsyncGenerator<[ string, KVStorageEntry ]>;
}


export class KVEntryStorage extends EntryStorage {
  constructor(kv: KVStorage) {
    super();
    this._kv = kv;
  }


  /**
   * For testing and debugging purposes.
   * Returns a map containing all entries in storage, where key is a path and value is a entry text content (for a file) or `undefined` (for a directory)
   */
  async entries(): Promise<{ [path: string]: Buffer | undefined }> {
    const result: { [path: string]: Buffer | undefined } = {};
    for await (const [ key, value ] of this._kv.enumerate()) {
      const isDir = value.type === StorageEntryType.Dir;
      result[key] = isDir ? undefined : value.data;
    }
    return result;
  }


  override async createDir(path: StoragePath): Promise<StorageEntryPointer> {
    let curPath = StoragePath.root;
    for (const part of path.parts) {
      curPath = curPath.child(part);
      const child = await this._kv.get(curPath.normalized);
      if (!child) {
        await this._kv.set(curPath.normalized, {
          type: StorageEntryType.Dir,
          createTs: Date.now(),
          updateTs: Date.now(),
          data: undefined,
        });
      } else if (child.type !== StorageEntryType.Dir) {
        throw new StorageError(StorageErrorCode.InvalidStructure, path, `Cannot create directory: a file with the same name already exists`);
      }
    }

    return new StorageEntryPointer(curPath, this);
  }


  override async children(entryPath: StoragePath): Promise<StorageEntryPointer[]> {
    const result: StorageEntryPointer[] = [];
    for await (const [ path ] of this._kv.enumerate()) {
      if ((new StoragePath(path)).parentDir.isEqual(entryPath)) {
        const child = new StorageEntryPointer(new StoragePath(path), this);
        result.push(child);
      }
    }

    return result;
  }


  override async exists(path: StoragePath): Promise<boolean> {
    const entry = await this._kv.get(path.normalized);
    return !!entry || path.isEqual(StoragePath.root);
  }


  override async read(path: StoragePath): Promise<Buffer> {
    if (path.isEqual(StoragePath.root)) {
      throw new StorageError(StorageErrorCode.NotFile, path, "Entry is not a file");
    }

    const entry = await this._kv.get(path.normalized);
    if (!entry) {
      throw new StorageError(StorageErrorCode.NotExists, path, `Entry does not exist`);
    }

    if (entry.type !== StorageEntryType.File) {
      throw new StorageError(StorageErrorCode.NotFile, path, `Entry is not a file`);
    }

    return entry.data || Buffer.alloc(0);
  }


  override async remove(entryPath: StoragePath): Promise<void> {
    for await (const [ path ] of this._kv.enumerate()) {
      if ((new StoragePath(path)).inside(entryPath, true)) {
        await this._kv.remove(path);
      }
    }
  }


  override async stats(path: StoragePath): Promise<StorageEntryStats> {
    if (path.isEqual(StoragePath.root)) {
      return {
        isDirectory: true,
        size: undefined,
        createTs: undefined,
        updateTs: undefined,
      };
    }

    const entry = await this._kv.get(path.normalized);
    if (!entry) {
      throw new StorageError(StorageErrorCode.NotExists, path, `Entry does not exist`);
    }

    return {
      isDirectory: entry.type === StorageEntryType.Dir,
      createTs: entry.createTs,
      updateTs: entry.updateTs,
      size: "unk" // we cannot determine byte size because we only have length of the string
    };
  }


  override async writeOrCreate(path: StoragePath, content: Buffer): Promise<StorageEntryPointer> {
    await this.createDir(path.parentDir);

    const entry = await this._kv.get(path.normalized);
    if (!entry) {
      await this._kv.set(path.normalized, {
        type: StorageEntryType.File,
        createTs: Date.now(),
        updateTs: Date.now(),
        data: content,
      });
    } else {
      await this._kv.set(path.normalized, {
        type: StorageEntryType.File,
        createTs: entry.createTs,
        updateTs: Date.now(),
        data: content,
      });
    }

    return new StorageEntryPointer(path, this);
  }


  private readonly _kv: KVStorage;
}
