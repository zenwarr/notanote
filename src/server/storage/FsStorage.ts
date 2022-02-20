import {
  joinNestedPathSecure,
  StorageEntryPointer,
  FileStats,
  StorageError,
  StorageErrorCode,
  StorageLayer
} from "../../common/storage/StorageLayer";
import * as fs from "fs";
import * as path from "path";
import { StoragePath } from "../../common/storage/StoragePath";
import { asyncExists } from "../plugin/PluginManager";


export class FsStorage extends StorageLayer {
  constructor(private rootPath: string) {
    super();
  }


  override async createDir(path: StoragePath) {
    const realPath = this.toAbsolute(path);
    await fs.promises.mkdir(realPath, { recursive: true });
    return new FsStorageEntry(path, this.toAbsolute(path));
  }


  override get(path: StoragePath) {
    return new FsStorageEntry(path, this.toAbsolute(path));
  }


  protected toAbsolute(path: StoragePath): string {
    const result = joinNestedPathSecure(this.rootPath, path.normalized);
    if (!result) {
      throw new Error("Path is outside root directory");
    }

    return result;
  }
}


export class FsStorageEntry extends StorageEntryPointer {
  constructor(path: StoragePath, absPath: string) {
    super(path);
    this.absPath = absPath;
  }


  private readonly absPath: string;


  override async children(): Promise<StorageEntryPointer[]> {
    try {
      const entries = await fs.promises.readdir(this.absPath);
      return entries.map(entry => new FsStorageEntry(this.path.child(entry), path.join(this.absPath, entry)));
    } catch (err: any) {
      if (err.code === "ENOENT") {
        throw new StorageError(StorageErrorCode.NotExists, this.path, "Path does not exist");
      } else if (err.code === "ENOTDIR") {
        throw new StorageError(StorageErrorCode.NotDirectory, this.path, "Not a directory");
      }
      throw err;
    }
  }


  override async readText(): Promise<string> {
    return fs.promises.readFile(this.absPath, "utf-8");
  }


  override async remove(): Promise<void> {
    const stat = await fs.promises.stat(this.absPath);
    if (stat.isDirectory()) {
      await fs.promises.rmdir(this.absPath, {
        recursive: true
      });
    } else {
      await fs.promises.rm(this.absPath);
    }
  }


  override async stats(): Promise<FileStats> {
    const stats = await fs.promises.stat(this.absPath);
    return {
      isDirectory: stats.isDirectory(),
      createTs: Math.floor(stats.birthtimeMs),
      updateTs: Math.floor(stats.mtimeMs)
    };
  }


  override async writeOrCreate(content: Buffer | string): Promise<void> {
    if (typeof content === "string") {
      content = Buffer.from(content, "utf-8");
    }

    await fs.promises.writeFile(this.absPath, content);
  }


  override async exists(): Promise<boolean> {
    return asyncExists(this.absPath);
  }
}
