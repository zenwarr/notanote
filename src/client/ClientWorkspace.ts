import { makeObservable, observable } from "mobx";
import { LocalSyncWorker } from "../common/sync/LocalSync";
import { SyncProvider } from "../common/sync/SyncProvider";
import { SerializableStorageEntryData } from "../common/workspace/SerializableStorageEntryData";
import { RecentDocStorage } from "./RecentDocStorage";
import { StoragePath } from "../common/storage/StoragePath";
import { MemoryCachedStorage } from "../common/storage/MemoryCachedStorage";
import { StorageEntryType } from "../common/storage/StorageLayer";
import { FileSettingsProvider } from "../common/workspace/FileSettingsProvider";
import { BrowserSyncMetadataStorage } from "./storage/BrowserSyncMetadataStorage";


export class ClientWorkspace {
  constructor(storage: MemoryCachedStorage, syncAdapter: SyncProvider, storageId: string) {
    makeObservable(this, {
      loading: observable,
      _selectedEntry: observable,
      _selectedFile: observable
    } as any);

    const lastOpenedDoc = RecentDocStorage.instance.getLastOpenedDoc();
    if (lastOpenedDoc) {
      const lastOpenedDocPath = new StoragePath(lastOpenedDoc);
      this._selectedEntry = lastOpenedDocPath;
      this._selectedFile = lastOpenedDocPath;
    }

    this.storage = storage;
    this.remoteStorageId = storageId;

    this.syncWorker = new LocalSyncWorker(
        syncAdapter,
        new BrowserSyncMetadataStorage()
    );
    this.syncWorker.addRoot(this.storage.get(StoragePath.root));
    this.syncWorker.runSync();
  }


  readonly remoteStorageId: string;
  loading = true;


  async load() {
    const allEntries = await this.storage.loadAll();
    if (!allEntries) {
      throw new Error(`Failed to load storage entries: loadAll returns undefined`);
    }

    this.storage.memory.setData(allEntries);

    await FileSettingsProvider.instance.load();

    this.loading = false;
  }


  walk(cb: (entry: SerializableStorageEntryData) => boolean) {
    function walkList(entries: SerializableStorageEntryData[] | undefined): boolean {
      for (const e of entries || []) {
        if (cb(e)) {
          return true;
        }

        if (walkList(e.children)) {
          return true;
        }
      }

      return false;
    }

    walkList(this.storage.getMemoryData(StoragePath.root)?.children || []);
  }


  async createEntry(path: StoragePath, type: StorageEntryType): Promise<void> {
    if (type === StorageEntryType.File && !path.normalized.match(/\.[a-z]+$/)) {
      path = new StoragePath(path.normalized + ".md");
    }

    const entry = this.storage.get(path);
    if (type === StorageEntryType.File) {
      await entry.writeOrCreate("");
    } else {
      await entry.createDir();
    }

    this.syncWorker.addRoot(entry);

    if (type === "file") {
      this.selectedEntry = path;
    }
  }


  async remove(path: StoragePath) {
    if (this.selectedEntry && path.isEqual(this.selectedEntry)) {
      const parentPath = path.parentDir;
      if (parentPath.isEqual(StoragePath.root)) {
        this.selectedEntry = undefined;
      } else {
        this.selectedEntry = parentPath;
      }
    }

    const pointer = await this.storage.get(path);
    await pointer.remove();

    this.syncWorker.addRoot(pointer);
  }


  get selectedEntry() {
    return this._selectedEntry;
  }


  set selectedEntry(path: StoragePath | undefined) {
    this._selectedEntry = path;

    if (path == null) {
      this._selectedFile = undefined;
    } else {
      const entry = this.storage.getMemoryData(path);
      if (entry && !entry.stats.isDirectory) {
        this._selectedFile = path;
        RecentDocStorage.instance.saveLastOpenedDoc(path.normalized);
      }
    }
  }


  get selectedFile() {
    return this._selectedFile;
  }


  private _selectedEntry: StoragePath | undefined = undefined;
  private _selectedFile: StoragePath | undefined = undefined;
  storage: MemoryCachedStorage;
  private static _instance: ClientWorkspace | undefined;
  syncWorker: LocalSyncWorker;


  static get instance() {
    if (!this._instance) {
      throw new Error("ClientWorkspace is not initialized");
    }

    return this._instance;
  }


  static init(storage: MemoryCachedStorage, syncAdapter: SyncProvider, wsId: string) {
    this._instance = new ClientWorkspace(storage, syncAdapter, wsId);
  }
}
