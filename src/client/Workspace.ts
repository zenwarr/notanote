import { FileSettingsProvider } from "@common/workspace/FileSettingsProvider";
import { StorageEntryData } from "@storage/StorageEntryData";
import { MemoryCachedStorage } from "@storage/MemoryCachedStorage";
import { EntryStorage, StorageEntryType } from "@storage/EntryStorage";
import { StoragePath } from "@storage/StoragePath";
import { isConflictingDiff, Sync } from "@sync/Sync";
import { SyncTargetProvider } from "@sync/SyncTargetProvider";
import { SyncDiffEntry } from "@sync/SyncDiffEntry";
import { DiffAction } from "@sync/SyncMetadataStorage";
import { SyncJobRunner } from "@sync/SyncJobRunner";
import { makeObservable, observable } from "mobx";
import { RecentDocStorage } from "./RecentDocStorage";


export class Workspace {
  constructor(storage: EntryStorage, syncTarget: SyncTargetProvider | undefined, storageName: string) {
    makeObservable(this, {
      loading: observable,
      loadError: observable,
      _selectedEntry: observable,
      _selectedFile: observable
    } as any);

    const lastOpenedDoc = RecentDocStorage.instance.getLastOpenedDoc();
    if (lastOpenedDoc) {
      const lastOpenedDocPath = new StoragePath(lastOpenedDoc);
      this._selectedEntry = lastOpenedDocPath;
      this._selectedFile = lastOpenedDocPath;
    }

    this.storage = new MemoryCachedStorage(storage);
    this.remoteStorageName = storageName;

    FileSettingsProvider.init(this.storage);

    if (syncTarget) {
      this.sync = new Sync(
          this.storage,
          syncTarget
      );
      this.syncJobRunner = new SyncJobRunner(this.sync);
    }
  }


  // todo: remove
  readonly remoteStorageName: string;
  loading = true;
  loadError: string | undefined;


  async init() {
    try {
      // todo: failing on this step can lead to damaging data
      await this.storage.initWithRemoteOutline();

      await FileSettingsProvider.instance.load();

      this.loading = false;
    } catch (error: any) {
      console.error("Error initializing workspace", error);
      this.loadError = error.message;
      this.loading = false;
    }

    // run and forget
    setTimeout(async () => {
      try {
        await this.sync?.updateDiff(StoragePath.root);
      } catch (e: any) {
        console.error("Failed to update diff: ", e);
      }

      await this.syncJobRunner?.run()
    }, 500);
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

    await this.sync?.updateDiff(entry.path);

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

    await this.sync?.updateDiff(pointer.path);
  }


  async acceptChangeTree(path: StoragePath, diff: SyncDiffEntry[]) {
    let syncDiffEntries = diff.filter(e => e.path.inside(path, true) && !isConflictingDiff(e.diff));
    await this.sync?.acceptMulti(syncDiffEntries);
  }


  async acceptChanges(diff: SyncDiffEntry, action: DiffAction) {
    await this.sync?.accept(diff, action);
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
  private static _instance: Workspace | undefined;
  sync: Sync | undefined;
  syncJobRunner: SyncJobRunner | undefined;


  static get instance() {
    if (!this._instance) {
      throw new Error("Workspace is not initialized");
    }

    return this._instance;
  }


  static init(storage: EntryStorage, syncTarget: SyncTargetProvider | undefined) {
    this._instance = new Workspace(storage, syncTarget, "default");
  }
}
