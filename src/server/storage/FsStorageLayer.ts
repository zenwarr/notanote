import { StorageLayer, StorageEntry, StorageLayerFlag, joinNestedPathSecure } from "../../common/storage/StorageLayer";
import * as fs from "fs";
import * as p from "path";
import { StoragePath } from "../../common/storage/StoragePath";
import { asyncExists } from "../plugin/PluginBuilder";


export class FsStorageLayer extends StorageLayer {
  constructor(private rootPath: string) {
    super();
  }


  override async createDir(path: StoragePath) {
    const realPath = this.toAbsolute(path);
    await fs.promises.mkdir(realPath, { recursive: true });
    return new FsStorageEntry(realPath, path);
  }


  override async get(path: StoragePath) {
    const realPath = this.toAbsolute(path);
    if (await asyncExists(realPath)) {
      return new FsStorageEntry(realPath, path);
    } else {
      return undefined
    }
  }


  protected toAbsolute(path: StoragePath): string {
    const result = joinNestedPathSecure(this.rootPath, path.path);
    if (!result) {
      throw new Error("Path is outside root directory");
    }

    return result;
  }


  override flags() {
    return StorageLayerFlag.Writable;
  }


  override async list(path: StoragePath) {
    try {
      const absPath = this.toAbsolute(path);
      const entries = await fs.promises.readdir(absPath);
      return entries.map(entry => new FsStorageEntry(p.join(absPath, entry), path.child(entry)));
    } catch (err: any) {
      if (err.code === "ENOENT") {
        return [];
      }
      throw err;
    }
  }


  override async write(path: StoragePath, content: Buffer | string) {
    const entry = new FsStorageEntry(this.toAbsolute(path), path);
    await entry.write(content);
    return entry;
  }


  override async remove(path: StoragePath) {
    const absPath = this.toAbsolute(path);

    const stat = await fs.promises.stat(absPath);
    if (stat.isDirectory()) {
      await fs.promises.rmdir(absPath, {
        recursive: true
      });
    } else {
      await fs.promises.rm(absPath);
    }
  }
}


export class FsStorageEntry extends StorageEntry {
  constructor(private readonly absPath: string, private readonly storagePath: StoragePath) {
    super();
  }


  override getPath(): StoragePath {
    return this.storagePath;
  }


  override async readText() {
    try {
      return fs.promises.readFile(this.absPath, "utf-8");
    } catch (err: any) {
      if (err.code === "ENOENT") {
        return undefined;
      }
      throw err;
    }
  }


  override async write(content: Buffer | string) {
    if (typeof content === "string") {
      content = Buffer.from(content, "utf-8");
    }
    await fs.promises.writeFile(this.absPath, content);
  }


  override flags() {
    return 0;
  }


  override async stats() {
    try {
      const stats = await fs.promises.stat(this.absPath);
      return {
        isDirectory: stats.isDirectory(),
        createTs: stats.birthtimeMs,
        updateTs: stats.mtimeMs
      }
    } catch (err: any) {
      if (err.code === "ENOENT") {
        return undefined;
      }
      throw err;
    }
  }
}
