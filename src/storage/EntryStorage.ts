import { StorageEntryData } from "@common/workspace/StorageEntryData";
import { StoragePath } from "./StoragePath";


export enum StorageChangeEvent {
  Create = "create",
  Update = "update",
  Remove = "remove"
}


export type StorageWatcherCallback = (p: StorageEntryPointer, event: StorageChangeEvent) => void;


interface StorageWatcher {
  path: StoragePath;
  cb: StorageWatcherCallback;
}


export abstract class EntryStorage {
  /**
   * Returns a pointer object for a given path.
   * Pointer objects are used to access stored data.
   * Pointers are always unique: there should be only one valid pointer for a path.
   * When a file or a directory is deleted, the pointer becomes invalid.
   * When a file or a directory is renamed or moved, the pointer to the old path becomes invalid too.
   *
   * A pointer can point to a path for which no actual entry in the storage exist.
   * For example, if you want to create a new file, you first get a pointer for the path you want your file to be stored in, and until you actually create the file, the pointer has no corresponding entry in the storage.
   */
  get(path: StoragePath): StorageEntryPointer {
    return new StorageEntryPointer(path, this);
  }


  /**
   * Creating a directory does not require its parent directories to be present — they are going to be created automatically.
   * If a directory already exists (or a file with given path exists), this method must throw an error.
   * Creating parent directories can partially fail, in which case already created dirs can be left in the storage.
   */
  abstract createDir(path: StoragePath): Promise<StorageEntryPointer>;


  /**
   * Reads the contents of a file.
   * Using the method on a directory must throw an error.
   */
  abstract read(path: StoragePath): Promise<Buffer>;


  /**
   * Replaces contents of the file at given path.
   * Using the method on a directory must throw an error.
   * If the file does not exist, it must be created (its parent directories must be created too).
   */
  abstract writeOrCreate(path: StoragePath, content: Buffer): Promise<StorageEntryPointer>;


  /**
   * This method should remove a file or a directory at given path.
   * If removing a directory, all its children should be removed recursively.
   * Removing a directory can fail partially, in which case an error should be thrown
   */
  abstract remove(path: StoragePath): Promise<void>;


  /**
   * Gets information on a file or directory.
   * If the path does not exist, this method must throw an error.
   */
  abstract stats(path: StoragePath): Promise<StorageEntryStats>;


  /**
   * Returns a list of children of a directory.
   * If the path does not exist, this method must throw an error.
   * If the path is not a directory, this method must throw an error.
   */
  abstract children(path: StoragePath): Promise<StorageEntryPointer[]>;


  /**
   * Returns `true` if a directory or a file exists at given path.
   * In some cases it can be more efficient than calling `stats` and checking for an error.
   */
  abstract exists(path: StoragePath): Promise<boolean>;


  /**
   * Loading outline leads to building a complete tree of StorageEntryData objects, but without actual data in `content` field.
   */
  async loadOutline(): Promise<StorageEntryData> {
    return this.toEntryData(this.get(StoragePath.root));
  }


  private async toEntryData(p: StorageEntryPointer): Promise<StorageEntryData> {
    const stats = await p.stats();

    const children = stats.isDirectory ? await this.children(p.path) : undefined;

    return {
      path: p.path,
      stats,
      children: children ? await Promise.all(children.map(c => this.toEntryData(c))) : undefined
    };
  }


  protected handleChange(path: StoragePath, event: StorageChangeEvent) {
    this.watchers.forEach(w => {
      if (path.isEqual(w.path)) {
        w.cb(this.get(path), event);
      }
    });
  }


  watch(path: StoragePath, cb: StorageWatcherCallback) {
    if (this.watchers.some(w => w.cb === cb)) {
      return;
    }

    this.watchers.push({
      path,
      cb
    });
  }


  unwatch(cb: StorageWatcherCallback) {
    this.watchers = this.watchers.filter(w => w.cb !== cb);
  }


  private watchers: StorageWatcher[] = [];
}


export enum StorageErrorCode {
  NotExists = "NOT_EXISTS",
  NotDirectory = "NOT_DIRECTORY",
  NotFile = "NOT_FILE",
  AlreadyExists = "ALREADY_EXISTS",
  InvalidStructure = "INVALID_STRUCTURE",
  DirectoryWrite = "DIRECTORY_WRITE",
  NoPermissions = "NO_PERMISSIONS",
  NotSupported = "NOT_SUPPORTED",
  Unknown = "UNKNOWN"
}


export class StorageError extends Error {
  constructor(code: StorageErrorCode, path: StoragePath, message: string) {
    super(message);
    this.code = code;
    this.path = path;
  }


  readonly code: StorageErrorCode;
  readonly path: StoragePath;
}


/**
 * Storage entry pointer is a immutable structure that gives access to underlying tree storage similar to filesystem.
 * This storage can be a real filesystem or any other storage.
 * While this structure is immutable, data it manages is mutable.
 */
export class StorageEntryPointer {
  constructor(path: StoragePath, storage: EntryStorage) {
    this.path = path;
    this.storage = storage;
  }


  public readonly path: StoragePath;


  public readonly storage: EntryStorage;


  async createDir(): Promise<void> {
    await this.storage.createDir(this.path);
  }


  async read(): Promise<Buffer> {
    return this.storage.read(this.path);
  }


  async writeOrCreate(content: Buffer): Promise<void> {
    await this.storage.writeOrCreate(this.path, content);
  }


  async remove(): Promise<void> {
    await this.storage.remove(this.path);
  }


  async stats(): Promise<StorageEntryStats> {
    return this.storage.stats(this.path);
  }


  async children(): Promise<StorageEntryPointer[]> {
    return this.storage.children(this.path);
  }


  async exists(): Promise<boolean> {
    return this.storage.exists(this.path);
  }
}


/**
 * Size is undefined for directories.
 * Size is "unk" for entries that can have a size, but used storage implementation does not allow determining it.
 */
export type StorageEntrySize = number | "unk" | undefined;


export interface StorageEntryStats {
  isDirectory: boolean;

  /**
   * Size should be set to undefined for directories.
   * If size cannot be determined because storage does not support it, it should be set to `unk`
   */
  size: StorageEntrySize;
  createTs: number | undefined;
  updateTs: number | undefined;
}


export enum StorageEntryType {
  File = "file",
  Dir = "dir"
}
