import * as path from "path";
import { StoragePath } from "./StoragePath";


export enum StorageLayerFlag {
  Writable = 1
}


export abstract class AbstractStorageLayer {
  abstract createDir(path: StoragePath): Promise<StorageEntry>;


  abstract createFile(path: StoragePath, content: Buffer | string): Promise<StorageEntry>;


  abstract flags(): number; // FsLayerProperty


  abstract get(path: StoragePath): Promise<StorageEntry | undefined>;


  abstract list(path: StoragePath): Promise<StorageEntry[] | undefined>;


  abstract write(path: StoragePath, content: Buffer | string): Promise<StorageEntry>;


  abstract remove(path: StoragePath): Promise<void>;
}


export enum StorageEntryFlag {
  Removed = 1
}


export abstract class StorageEntry {
  abstract getPath(): StoragePath;


  getBasename(): string {
    return this.getPath().basename;
  }


  abstract stats(): Promise<StorageEntryStats | undefined>;


  abstract write(content: Buffer | string): Promise<void>;


  abstract readText(): Promise<string | undefined>;


  abstract flags(): number; // FsEntryFlag
}


export interface StorageEntryStats {
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
