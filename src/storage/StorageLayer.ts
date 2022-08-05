import { StorageEntryData } from "@common/workspace/StorageEntryData";
import { StoragePath } from "./StoragePath";


export abstract class StorageLayer {
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
  abstract get(path: StoragePath): StorageEntryPointer;


  abstract createDir(path: StoragePath): Promise<StorageEntryPointer>;


  abstract read(path: StoragePath): Promise<Buffer>;


  abstract writeOrCreate(path: StoragePath, content: Buffer): Promise<StorageEntryPointer>;


  abstract remove(path: StoragePath): Promise<void>;


  abstract stats(path: StoragePath): Promise<StorageEntryStats>;


  abstract children(path: StoragePath): Promise<StorageEntryPointer[]>;


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
}


export enum StorageErrorCode {
  Io = "IO_ERROR",
  NotExists = "NOT_EXISTS",
  NotDirectory = "NOT_DIRECTORY",
  NotFile = "NOT_FILE",
  AlreadyExists = "ALREADY_EXISTS",
  InvalidStructure = "INVALID_STRUCTURE",
  DirectoryWrite = "DIRECTORY_WRITE",
  BinaryContentNotSupported = "BINARY_CONTENT_NOT_SUPPORTED",
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
  constructor(path: StoragePath, storage: StorageLayer) {
    this.path = path;
    this.storage = storage;
  }


  public readonly path: StoragePath;


  public readonly storage: StorageLayer;


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
