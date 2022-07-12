import {
  StorageEntryPointer,
  FileStats,
  StorageError,
  StorageErrorCode,
  StorageLayer
} from "../../common/storage/StorageLayer";
import * as fs from "fs";
import { joinNestedPathSecure, StoragePath } from "../../common/storage/StoragePath";
import { asyncExists } from "../plugin/PluginManager";


export class FsStorage extends StorageLayer {
  constructor(private rootPath: string) {
    super();
  }


  override async createDir(path: StoragePath): Promise<StorageEntryPointer> {
    const realPath = this.toAbsolutePath(path);
    await fs.promises.mkdir(realPath, { recursive: true });
    return new StorageEntryPointer(path, this);
  }


  override get(path: StoragePath): StorageEntryPointer {
    return new StorageEntryPointer(path, this);
  }


  protected toAbsolutePath(path: StoragePath): string {
    const result = joinNestedPathSecure(this.rootPath, path.normalized);
    if (!result) {
      throw new Error("Path is outside root directory");
    }

    return result;
  }


  override async children(path: StoragePath): Promise<StorageEntryPointer[]> {
    const entryAbsPath = this.toAbsolutePath(path);

    try {
      const entries = await fs.promises.readdir(this.toAbsolutePath(path));
      return entries.map(entry => new StorageEntryPointer(path.child(entry), this));
    } catch (err: any) {
      if (err.code === "ENOENT") {
        throw new StorageError(StorageErrorCode.NotExists, path, "Path does not exist");
      } else if (err.code === "ENOTDIR") {
        throw new StorageError(StorageErrorCode.NotDirectory, path, "Not a directory");
      }
      throw err;
    }
  }


  override async readText(path: StoragePath): Promise<string> {
    return fs.promises.readFile(this.toAbsolutePath(path), "utf-8");
  }


  override async remove(path: StoragePath): Promise<void> {
    const absPath = this.toAbsolutePath(path);
    const stat = await fs.promises.stat(absPath);
    if (stat.isDirectory()) {
      await fs.promises.rmdir(absPath, {
        recursive: true
      });
    } else {
      await fs.promises.rm(absPath);
    }
  }


  override async stats(path: StoragePath): Promise<FileStats> {
    const absPath = this.toAbsolutePath(path);
    const stats = await fs.promises.stat(absPath);
    return {
      isDirectory: stats.isDirectory(),
      size: stats.isDirectory() ? undefined : stats.size,
      createTs: Math.floor(stats.birthtimeMs),
      updateTs: Math.floor(stats.mtimeMs)
    };
  }


  override async writeOrCreate(path: StoragePath, content: Buffer | string): Promise<StorageEntryPointer> {
    const absPath = this.toAbsolutePath(path);
    if (typeof content === "string") {
      content = Buffer.from(content, "utf-8");
    }

    await fs.promises.writeFile(absPath, content);
    return new StorageEntryPointer(path, this);
  }


  override async exists(path: StoragePath): Promise<boolean> {
    return asyncExists(this.toAbsolutePath(path));
  }
}
