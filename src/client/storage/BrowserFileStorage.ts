import * as mobx from "mobx";
import { StorageEntryStats, StorageEntryPointer, StorageError, StorageErrorCode, StorageLayer } from "@storage/StorageLayer";
import { StoragePath } from "@storage/StoragePath";
import { ClientKeyValueStore } from "./ClientKeyValueStore";


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

    return new StorageEntryPointer(path, this);
  }


  override get(path: StoragePath): StorageEntryPointer {
    return new StorageEntryPointer(path, this);
  }


  async getHandle(path: StoragePath, create = false): Promise<{
    parent: FileSystemDirectoryHandle | undefined,
    child: FileSystemHandle | undefined
  } | undefined> {
    if (path.isEqual(StoragePath.root)) {
      return {
        parent: undefined,
        child: this.root
      };
    }

    const parentHandles = await this.getDirectoryHandle(path.parentDir, create);
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
          child: await parentHandles.child.getDirectoryHandle(path.basename, { create })
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
    const value: FileSystemDirectoryHandle | undefined = await ClientKeyValueStore.defaultInstance.get(key);
    if (!value) {
      return undefined;
    } else {
      const isLocked = (await value.queryPermission({ mode: "readwrite" })) !== "granted";
      return new BrowserFileStorageLayer(value, isLocked);
    }
  }


  async saveHandle(key: string) {
    return ClientKeyValueStore.defaultInstance.set(key, this.root);
  }


  override async children(path: StoragePath): Promise<StorageEntryPointer[]> {
    const handles = await this.getHandle(path);
    if (!handles) {
      throw new StorageError(StorageErrorCode.NotExists, path, "Directory does not exist");
    }

    const dir = handles.child instanceof FileSystemDirectoryHandle ? handles.child : undefined;
    if (!dir) {
      throw new Error("Not a directory");
    }

    const result: StorageEntryPointer[] = [];
    for await (const value of dir.values()) {
      result.push(new StorageEntryPointer(path.child(value.name), this));
    }

    return result;
  }


  override async read(path: StoragePath): Promise<Buffer> {
    const handles = await this.getHandle(path);
    if (!handles) {
      throw new StorageError(StorageErrorCode.NotExists, path, "File does not exist");
    }

    const fileHandle = handles.child instanceof FileSystemFileHandle ? handles.child : undefined;
    if (!fileHandle) {
      throw new Error("Not a file");
    }

    const buf = await (await fileHandle.getFile()).arrayBuffer();
    return Buffer.from(buf);
  }


  override async remove(path: StoragePath): Promise<void> {
    const handles = await this.getHandle(path);
    if (!handles) {
      throw new StorageError(StorageErrorCode.NotExists, path, "File does not exist");
    }

    if (!handles.parent) {
      throw new StorageError(StorageErrorCode.InvalidStructure, path.parentDir, "Cannot remove root directory");
    }

    await handles.parent.removeEntry(path.basename, { recursive: true });
  }


  override async stats(path: StoragePath): Promise<StorageEntryStats> {
    const handles = await this.getHandle(path);
    if (!handles || !handles.child) {
      throw new StorageError(StorageErrorCode.NotExists, path, "File does not exist");
    }

    return {
      isDirectory: handles.child.kind === "directory",
      size: "unk",
      createTs: undefined,
      updateTs: undefined
    };
  }


  override async writeOrCreate(path: StoragePath, content: Buffer): Promise<StorageEntryPointer> {
    const handles = await this.getHandle(path, true);
    if (!handles) {
      throw new StorageError(StorageErrorCode.NotExists, path, "File does not exist");
    }

    if ((handles.child && handles.child.kind !== "file") || !handles.parent) {
      throw new StorageError(StorageErrorCode.DirectoryWrite, path, "Cannot write to a directory");
    }

    if (!handles.child) {
      handles.child = await handles.parent.getFileHandle(path.basename, { create: true });
    }

    const fileHandle = handles.child as FileSystemFileHandle;
    const writable = await fileHandle.createWritable({ keepExistingData: false });
    await writable.truncate(0);
    await writable.write(content);
    await writable.close();

    return new StorageEntryPointer(path, this);
  }


  override async exists(path: StoragePath): Promise<boolean> {
    const handles = await this.getHandle(path);
    return !!handles && !!handles.child;
  }
}
