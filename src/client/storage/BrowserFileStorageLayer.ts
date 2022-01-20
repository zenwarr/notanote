import { StorageEntry, StorageEntryStats, StorageLayer, StorageLayerFlag } from "../../common/storage/StorageLayer";
import { StoragePath } from "../../common/storage/StoragePath";


export class BrowserFileStorageLayer extends StorageLayer {
  constructor(root: FileSystemDirectoryHandle) {
    super();
    this.root = root;
  }


  private readonly root: FileSystemDirectoryHandle;


  override async createDir(path: StoragePath): Promise<StorageEntry> {
    const dir = await this.getDirectoryForPath(path, true);
    if (!dir) {
      throw new Error("Failed to create directory");
    }

    return new BrowserFileStorageEntry(dir, path);
  }


  override flags(): number {
    return StorageLayerFlag.Writable;
  }


  override async get(path: StoragePath): Promise<StorageEntry | undefined> {
    const parentDir = await this.getDirectoryForPath(path.parentDir);
    if (!parentDir) {
      return undefined;
    }

    const file = await parentDir.getFileHandle(path.basename);
    return new BrowserFileStorageEntry(file, path);
  }


  override async list(path: StoragePath): Promise<StorageEntry[] | undefined> {
    const dir = await this.getDirectoryForPath(path);
    if (!dir) {
      return undefined;
    }

    const result: BrowserFileStorageEntry[] = [];
    for await (const value of dir.values()) {
      result.push(new BrowserFileStorageEntry(value, path.child(value.name)));
    }

    return result;
  }


  override async remove(path: StoragePath): Promise<void> {
    const parent = await this.getDirectoryForPath(path.parentDir);
    if (!parent) {
      return;
    }

    await parent.removeEntry(path.basename, { recursive: true });
  }


  override async write(path: StoragePath, content: Buffer | string): Promise<StorageEntry> {
    const dir = await this.getDirectoryForPath(path, true);
    if (!dir) {
      throw new Error("Failed to create directory");
    }

    const file = await dir.getFileHandle(path.basename, { create: true });
    const entry = new BrowserFileStorageEntry(file, path);
    await entry.write(content);
    return entry;
  }


  private async getDirectoryForPath(path: StoragePath, createMissing = false): Promise<FileSystemDirectoryHandle | undefined> {
    if (path.isEqual(StoragePath.root)) {
      return this.root;
    } else {
      const parent = await this.getDirectoryForPath(path.parentDir, createMissing);
      if (parent === undefined) {
        return undefined;
      } else {
        return parent.getDirectoryHandle(path.basename, { create: createMissing });
      }
    }
  }


  static async requestFromUser(): Promise<BrowserFileStorageLayer | undefined> {
    try {
      return new BrowserFileStorageLayer(await showDirectoryPicker());
    } catch (error) {
      return undefined;
    }
  }
}


class BrowserFileStorageEntry extends StorageEntry {
  constructor(handle: FileSystemHandle, path: StoragePath) {
    super();
    this.handle = handle;
    this.path = path;
  }


  private readonly handle: FileSystemHandle;
  private readonly path: StoragePath;


  override flags(): number {
    return 0;
  }


  override getPath(): StoragePath {
    return this.path;
  }


  override async readText(): Promise<string | undefined> {
    if (this.handle.kind === "file") {
      return (await this.handle.getFile()).text();
    } else {
      return undefined;
    }
  }


  override async stats(): Promise<StorageEntryStats | undefined> {
    return {
      isDirectory: this.handle.kind === "directory",
      createTs: undefined,
      updateTs: undefined
    };
  }


  override async write(content: Buffer | string): Promise<void> {
    if (this.handle.kind !== "file") {
      throw new Error("Cannot write: entry is not a file");
    }

    const writable = await this.handle.createWritable({ keepExistingData: false });
    await writable.truncate(0);
    await writable.write(content);
    await writable.close();
  }
}
