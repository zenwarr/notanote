import { FileStats, StorageEntryPointer, StorageEntryType, StorageError, StorageErrorCode, StorageLayer } from "./StorageLayer";
import { StoragePath } from "./StoragePath";


export interface SerializedKVStorageEntry {
  type: StorageEntryType;
  createTs: number | undefined;
  updateTs: number | undefined;
  data: string | undefined;
}


export interface KVStorage {
  get(key: string): Promise<SerializedKVStorageEntry | undefined>;

  set(key: string, value: SerializedKVStorageEntry): Promise<void>;

  remove(key: string): Promise<void>;

  enumerate(): AsyncGenerator<[ string, SerializedKVStorageEntry ]>;
}


export class KVStorageLayer extends StorageLayer {
  constructor(kv: KVStorage) {
    super();
    this._kv = kv;
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
      }
    }

    return new StorageEntryPointer(curPath, this);
  }


  override get(path: StoragePath): StorageEntryPointer {
    return new StorageEntryPointer(path, this);
  }


  override async children(entryPath: StoragePath): Promise<StorageEntryPointer[]> {
    const result: StorageEntryPointer[] = [];
    for await (const [ path ] of this._kv.enumerate()) {
      if ((new StoragePath(path)).inside(entryPath, false)) {
        const child = new StorageEntryPointer(new StoragePath(path), this);
        result.push(child);
      }
    }

    return result;
  }


  override async exists(path: StoragePath): Promise<boolean> {
    const entry = await this._kv.get(path.normalized);
    return !!entry;
  }


  override async readText(path: StoragePath): Promise<string> {
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

    return entry.data!;
  }


  override async remove(entryPath: StoragePath): Promise<void> {
    for await (const [ path ] of this._kv.enumerate()) {
      if ((new StoragePath(path)).inside(entryPath, true)) {
        await this._kv.remove(path);
      }
    }
  }


  override async stats(path: StoragePath): Promise<FileStats> {
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


  override async writeOrCreate(path: StoragePath, content: Buffer | string): Promise<StorageEntryPointer> {
    const entry = await this._kv.get(path.normalized);
    if (!entry) {
      await this._kv.set(path.normalized, {
        type: StorageEntryType.File,
        createTs: Date.now(),
        updateTs: Date.now(),
        data: content.toString(),
      });
    } else {
      await this._kv.set(path.normalized, {
        type: StorageEntryType.File,
        createTs: entry.createTs,
        updateTs: Date.now(),
        data: content.toString(),
      });
    }

    return new StorageEntryPointer(path, this);
  }


  private readonly _kv: KVStorage;
}
