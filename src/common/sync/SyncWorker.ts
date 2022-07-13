import * as _ from "lodash";
import * as mobx from "mobx";
import assert from "assert";
import { StorageEntryPointer } from "../storage/StorageLayer";
import { StoragePath } from "../storage/StoragePath";
import { getContentIdentity, readEntityTextIfAny } from "./ContentIdentity";
import { SyncEntry, SyncResult, SyncResultAction } from "./StorageSync";
import { SyncMetadataMap, SyncMetadataStorage } from "./SyncMetadataStorage";
import { SyncProvider } from "./SyncProvider";


export interface PendingConflict {
  ts: Date;
  syncResult: SyncResult;
}


export class SyncWorker {
  constructor(syncProvider: SyncProvider, syncMetadata: SyncMetadataStorage) {
    this.syncMetadata = syncMetadata;
    this.syncProvider = syncProvider;

    mobx.makeObservable(this, {
      pendingConflicts: mobx.observable,
      pendingRoots: mobx.observable
    });

    this.debouncedNextSync = _.debounce(this.processNextSyncWrapper, 5000);
  }


  private readonly syncMetadata: SyncMetadataStorage;
  private readonly syncProvider: SyncProvider;


  addRoot(ep: StorageEntryPointer) {
    for (const root of this.pendingRoots) {
      if (ep.path.inside(root.path) || ep.path.isEqual(root.path)) {
        return;
      }
    }

    this.pendingRoots.push(ep);

    if (this.syncingNow) {
      return;
    }

    this.debouncedNextSync()?.catch(error => console.error("Sync failed:", error));
  }


  private debouncedNextSync: () => Promise<void> | undefined;


  private async processNextSyncWrapper(): Promise<void> {
    while (this.pendingRoots.length > 0) {
      try {
        this.syncingNow = true;
        await this.processNextSync();
      } finally {
        this.syncingNow = false;
      }
    }
  }


  private async processNextSync(): Promise<void> {
    const root = this.pendingRoots.shift();
    if (!root) {
      return;
    }

    const syncResults = await this.syncProvider.sync(await this.getSyncEntry(root));
    console.log("sync done", syncResults);

    let needSendData = false;
    let updatedMetadata: SyncMetadataMap = {};
    for (const result of syncResults) {
      if ("action" in result) {
        switch (result.action) {
          case SyncResultAction.Updated:
          case SyncResultAction.Created:
            updatedMetadata[result.path] = result.identity;
            break;

          case SyncResultAction.Removed:
            updatedMetadata[result.path] = undefined;
            break;

          case SyncResultAction.CreateDataRequired:
          case SyncResultAction.UpdateDataRequired:
            this.sendDataOnNextSync.add(result.path);
            needSendData = true;
            this.pendingRoots.unshift(root.storage.get(new StoragePath(result.path)));
            break;

          case SyncResultAction.LocalUpdateRequired:
          case SyncResultAction.LocalCreateRequired: {
            assert(result.data != null, "Missing entry data for local update/create");
            const wp = root.storage.get(new StoragePath(result.path));
            await wp.writeOrCreate(result.data);
            updatedMetadata[result.path] = result.identity;
          }
            break;

          case SyncResultAction.LocalRemoveRequired: {
            const wp = root.storage.get(new StoragePath(result.path));
            await wp.remove();
          }
            break;
        }
      }

      await this.syncMetadata.setMulti(updatedMetadata);

      this.pendingConflicts = syncResults.filter(r => "conflict" in r).map(r => ({
        ts: new Date(),
        syncResult: r
      }));
    }
  }


  private async getSyncEntry(sp: StorageEntryPointer): Promise<SyncEntry> {
    const isDir = (await sp.stats()).isDirectory;

    const [ syncedIdentity, curIdentity ] = await Promise.all([
      this.syncMetadata.get(sp.path),
      getContentIdentity(sp)
    ]);

    const children = isDir ? await sp.children() : [];

    let data: string | undefined;
    if (this.sendDataOnNextSync.has(sp.path.normalized)) {
      data = await readEntityTextIfAny(sp);
      this.sendDataOnNextSync.delete(sp.path.normalized);
    }

    return {
      path: sp.path,
      synced: syncedIdentity,
      identity: curIdentity,
      isDir,
      children: isDir ? await Promise.all(children.map(child => this.getSyncEntry(child))) : undefined,
      data
    };
  }


  /**
   * List of roots that wait to be synced with remote
   */
  pendingRoots: StorageEntryPointer[] = [];
  pendingConflicts: PendingConflict[] = [];
  sendDataOnNextSync = new Set<string>();
  private syncingNow = false;
}
