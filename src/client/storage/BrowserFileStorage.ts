import { FileStats, StorageEntryPointer, StorageLayer } from "../../common/storage/StorageLayer";
import { StoragePath } from "../../common/storage/StoragePath";
import * as idb from "idb-keyval";
import * as mobx from "mobx";


export class BrowserFileStorageLayer extends StorageLayer {
  constructor(root: FileSystemDirectoryHandle, isLocked = false) {
    super();
    this.root = root;
    this._locked = isLocked;
    mobx.makeObservable(this, {
      _locked: mobx.observable,
    } as any);
  }


  private readonly root: FileSystemDirectoryHandle;
  private _locked = false;


  isLocked(): boolean {
    return this._locked;
  }


  async unlock(): Promise<boolean> {
    if (!this._locked) {
      return true;
    }

    const result = await this.root.requestPermission({ mode: "readwrite" });
    if (result !== "granted") {
      return false;
    }

    this._locked = false;
    return true;
  }


  override async createDir(path: StoragePath): Promise<StorageEntryPointer> {
    const dirs = await this.getDirectoryHandle(path, true);
    if (!dirs) {
      throw new Error("Failed to create directory");
    }

    return new BrowserFileStorageEntry(path, this, dirs.parent, dirs.child);
  }


  override get(path: StoragePath): StorageEntryPointer {
    return new BrowserFileStorageEntry(path, this);
  }


  async getHandle(path: StoragePath): Promise<{
    parent: FileSystemDirectoryHandle | undefined,
    child: FileSystemHandle | undefined
  } | undefined> {
    if (path.isEqual(StoragePath.root)) {
      return {
        parent: undefined,
        child: this.root
      };
    }

    const parentHandles = await this.getDirectoryHandle(path.parentDir);
    if (!parentHandles) {
      return undefined;
    }

    try {
      return {
        parent: parentHandles.child,
        child: await parentHandles.child.getFileHandle(path.basename)
      };
    } catch (error) {
      try {
        return {
          parent: parentHandles.child,
          child: await parentHandles.child.getDirectoryHandle(path.basename)
        };
      } catch (error) {
        return {
          parent: parentHandles.child,
          child: undefined
        };
      }
    }
  }


  async getDirectoryHandle(path: StoragePath, create = false): Promise<{
    parent: FileSystemDirectoryHandle | undefined,
    child: FileSystemDirectoryHandle
  } | undefined> {
    if (path.isEqual(StoragePath.root)) {
      return {
        parent: undefined,
        child: this.root
      };
    }

    const handles = await this.getDirectoryHandle(path.parentDir, create);
    if (!handles) {
      return undefined;
    }

    try {
      const childHandle = await handles.child.getDirectoryHandle(path.basename, { create });
      return {
        parent: handles.child,
        child: childHandle
      };
    } catch (error) {
      return undefined;
    }
  }


  static async requestFromUser(): Promise<BrowserFileStorageLayer | undefined> {
    try {
      return new BrowserFileStorageLayer(await showDirectoryPicker());
    } catch (error) {
      return undefined;
    }
  }


  static async fromSavedHandle(key: string): Promise<BrowserFileStorageLayer | undefined> {
    const value: FileSystemDirectoryHandle | undefined = await idb.get(key);
    if (!value) {
      return undefined;
    } else {
      const isLocked = (await value.queryPermission({ mode: "readwrite" })) !== "granted";
      return new BrowserFileStorageLayer(value, isLocked);
    }
  }


  async saveHandle(key: string) {
    return idb.set(key, this.root);
  }
}


export class BrowserFileStorageEntry extends StorageEntryPointer {
  constructor(path: StoragePath, layer: BrowserFileStorageLayer, dirHandle?: FileSystemDirectoryHandle, handle?: FileSystemHandle) {
    super(path);
    this.layer = layer;
    this.dirHandle = dirHandle;
    this.handle = handle;
  }


  private readonly layer: BrowserFileStorageLayer;
  private dirHandle: FileSystemDirectoryHandle | undefined;
  private handle: FileSystemHandle | undefined;


  override async children(): Promise<StorageEntryPointer[]> {
    await this.lazyInitHandles();

    if (!this.handle) {
      throw new Error("Directory not found");
    }

    const dir = this.handle instanceof FileSystemDirectoryHandle ? this.handle : undefined;
    if (!dir) {
      throw new Error("Not a directory");
    }

    const result: StorageEntryPointer[] = [];
    for await (const value of dir.values()) {
      result.push(
          new BrowserFileStorageEntry(
              this.path.child(value.name),
              this.layer,
              dir,
              value
          )
      );
    }

    return result;
  }


  override async readText(): Promise<string> {
    await this.lazyInitHandles();

    const fileHandle = this.handle instanceof FileSystemFileHandle ? this.handle : undefined;
    if (!fileHandle) {
      throw new Error("Not a file");
    }

    return (await fileHandle.getFile()).text();
  }


  override async remove(): Promise<void> {
    await this.lazyInitHandles();

    if (this.dirHandle) {
      await this.dirHandle.removeEntry(this.path.basename, { recursive: true });
    }
  }


  override async stats(): Promise<FileStats> {
    await this.lazyInitHandles();

    return {
      isDirectory: this.handle?.kind === "directory",
      createTs: undefined,
      updateTs: undefined
    };
  }


  override async writeOrCreate(content: Buffer | string): Promise<void> {
    await this.lazyInitHandles();

    if (!this.dirHandle) {
      throw new Error("Parent directory does not exist");
    }

    if (!this.handle) {
      this.handle = await this.dirHandle.getFileHandle(this.path.basename, { create: true });
    }

    if (this.handle.kind !== "file") {
      throw new Error("Cannot write: entry is not a file");
    }

    const fileHandle = this.handle as FileSystemFileHandle;
    const writable = await fileHandle.createWritable({ keepExistingData: false });
    await writable.truncate(0);
    await writable.write(content);
    await writable.close();
  }


  override async exists(): Promise<boolean> {
    await this.lazyInitHandles();
    return this.handle != null;
  }


  private async lazyInitHandles() {
    if (this.handle && this.dirHandle) {
      return;
    }

    const d = await this.layer.getHandle(this.path);

    if (d) {
      this.dirHandle = d.parent;
      this.handle = d.child;
    }
  }
}
