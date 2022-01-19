import { StorageEntry, StorageEntryStats, StorageLayer } from "../../common/storage/StorageLayer";
import { StoragePath } from "../../common/storage/StoragePath";


export class BrowserFileStorageLayer extends StorageLayer {
  constructor(private readonly root: FileSystemDirectoryHandle) {
    super();
  }


  override async createDir(path: StoragePath): Promise<StorageEntry> {
    const handle = await this.root.getDirectoryHandle(path.path, {
      create: true
    });
    return new BrowserFileStorageEntry(handle, path);
  }


  override async createFile(path: StoragePath, content: Buffer | string): Promise<StorageEntry> {
    throw new Error("Method not implemented"); // todo
  }


  override flags(): number {
    throw new Error("Method not implemented"); // todo
  }


  override async get(path: StoragePath): Promise<StorageEntry | undefined> {
    throw new Error("Method not implemented"); // todo
  }


  override async list(path: StoragePath): Promise<StorageEntry[] | undefined> {
    throw new Error("Method not implemented"); // todo
  }


  override async remove(path: StoragePath): Promise<void> {
    throw new Error("Method not implemented"); // todo
  }


  override async write(path: StoragePath, content: Buffer | string): Promise<StorageEntry> {
    throw new Error("Method not implemented"); // todo
  }


  static async create(): Promise<BrowserFileStorageLayer | undefined> {
    try {
      return new BrowserFileStorageLayer(await showDirectoryPicker());
    } catch (error) {
      return undefined;
    }
  }
}


class BrowserFileStorageEntry extends StorageEntry {
  constructor(private readonly handle: FileSystemHandle, private readonly path: StoragePath) {
    super();
  }


  override flags(): number {
    return 0;
  }


  override getPath(): StoragePath {
    return this.path;
  }


  override async readText(): Promise<string | undefined> {
    return this.handle.isFile ? (await this.handle.getFile()).text() : undefined;
  }


  override async stats(): Promise<StorageEntryStats | undefined> {
    return {
      isDirectory: this.handle.isDirectory,
      createTs: undefined,
      updateTs: undefined
    };
  }


  override async write(content: Buffer | string): Promise<void> {
    if (!this.handle.isFile) {
      throw new Error("Cannot write: entry is not a file");
    }

    const writable = await this.handle.createWritable()
    await writable.write(content);
    await writable.close();
  }
}
