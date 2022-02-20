import * as path from "path";
import { StoragePath } from "./StoragePath";
import { SerializableStorageEntryData } from "../workspace/SerializableStorageEntryData";


export abstract class StorageLayer {
  abstract createDir(path: StoragePath): Promise<StorageEntryPointer>;


  abstract get(path: StoragePath): StorageEntryPointer;


  async loadAll(): Promise<SerializableStorageEntryData | undefined> {
    return undefined;
  }
}


export enum StorageErrorCode {
  Io = "IO_ERROR",
  NotExists = "NOT_EXISTS",
  NotDirectory = "NOT_DIRECTORY",
  NotFile = "NOT_FILE",
  AlreadyExists = "ALREADY_EXISTS",
  InvalidStructure = "INVALID_STRUCTURE",
}


export class StorageError extends Error {
  constructor(public code: StorageErrorCode, public path: StoragePath, public message: string) {
    super(message);
  }
}


export abstract class StorageEntryPointer {
  constructor(path: StoragePath) {
    this.path = path;
  }


  public readonly path: StoragePath;


  abstract readText(): Promise<string>;


  abstract writeOrCreate(content: Buffer | string): Promise<void>;


  abstract remove(): Promise<void>;


  abstract stats(): Promise<FileStats>;


  abstract children(): Promise<StorageEntryPointer[]>;


  abstract exists(): Promise<boolean>;
}


export interface FileStats {
  isDirectory: boolean;
  createTs: number | undefined;
  updateTs: number | undefined;
}


export function joinNestedPathSecure(root: string, nested: string): string | undefined {
  if (nested.indexOf("\0") >= 0) {
    return undefined;
  }

  if (!root.endsWith(path.sep)) {
    root = root + path.sep;
  }

  const result = path.join(root, nested);
  if (!isPathInsideRoot(root, result)) {
    return undefined;
  }

  return result;
}


export function addEndingPathSlash(p: string) {
  return p.endsWith(path.sep) ? p : p + path.sep;
}


export function isPathInsideRoot(root: string, nested: string): boolean {
  if (addEndingPathSlash(root) === addEndingPathSlash(nested)) {
    return true;
  }

  return nested.startsWith(addEndingPathSlash(root));
}


export enum StorageEntryType {
  File = "file",
  Dir = "dir"
}
