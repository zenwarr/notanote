import { ContentIdentity } from "@sync/ContentIdentity";
import { SyncDiffEntry } from "@sync/SyncDiffEntry";
import { SyncJobRunner } from "@sync/test/SyncJobRunner";
import { makeObservable, observable } from "mobx";
import { LocalSyncWorker } from "@sync/LocalSyncWorker";
import { RemoteSyncProvider } from "@sync/RemoteSyncProvider";
import { StorageEntryData } from "@common/workspace/StorageEntryData";
import { RecentDocStorage } from "./RecentDocStorage";
import { StoragePath } from "@storage/StoragePath";
import { MemoryCachedStorage } from "@storage/MemoryCachedStorage";
import { StorageEntryType } from "@storage/StorageLayer";
import { FileSettingsProvider } from "@common/workspace/FileSettingsProvider";
import { BrowserSyncMetadataStorage } from "./storage/BrowserSyncMetadataStorage";


export class ClientWorkspace {
  constructor(storage: MemoryCachedStorage, syncAdapter: RemoteSyncProvider, storageId: string) {
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
        this.storage,
        syncAdapter,
        new BrowserSyncMetadataStorage()
    );
    this.syncJobRunner = new SyncJobRunner(this.syncWorker);
  }


  readonly remoteStorageId: string;
  loading = true;


  async init() {
    // todo: failing on this step can lead to damaging data
    await this.storage.initWithRemoteOutline();

    // todo: run in background
    await this.syncWorker.updateDiff(StoragePath.root);

    await FileSettingsProvider.instance.load();

    this.loading = false;
  }


  walk(cb: (entry: StorageEntryData) => boolean) {
    function walkList(entries: StorageEntryData[] | undefined): boolean {
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
      await entry.writeOrCreate(Buffer.alloc(0));
    } else {
      await entry.createDir();
    }

    await this.syncWorker.updateDiff(entry.path);
    await this.syncJobRunner.run();

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

    await this.syncWorker.updateDiff(pointer.path);
    await this.syncJobRunner.run();
  }


  async acceptChanges(path: StoragePath, diff: SyncDiffEntry[], acceptRemote: boolean) {
    await this.syncWorker.acceptMulti(getIdentityMapFromDiff(path, diff, acceptRemote), acceptRemote);
    await this.syncJobRunner.run();
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
  syncJobRunner: SyncJobRunner;


  static get instance() {
    if (!this._instance) {
      throw new Error("ClientWorkspace is not initialized");
    }

    return this._instance;
  }


  static init(storage: MemoryCachedStorage, syncAdapter: RemoteSyncProvider, wsId: string) {
    this._instance = new ClientWorkspace(storage, syncAdapter, wsId);
  }
}


function getIdentityMapFromDiff(path: StoragePath, diff: SyncDiffEntry[], acceptRemote: boolean) {
  let map: { [path: string]: ContentIdentity | undefined } = {};

  for (const d of diff) {
    if (d.path.inside(path, true)) {
      map[d.path.normalized] = acceptRemote ? d.remote : d.actual;
    }
  }

  return map;
}
