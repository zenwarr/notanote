import { patternMatches } from "@common/utils/patterns";
import { EntryStorage, StorageError, StorageErrorCode } from "@storage/entry-storage";
import { StoragePath } from "@storage/storage-path";
import { WorkspaceSettingsProvider } from "@storage/workspace-settings-provider";
import { shouldPathBeSynced } from "@sync/ignore";
import { DiffHandleRule, StorageSyncData } from "@sync/storage-sync-data";
import { isAccepted, shouldReadFromLocalToAccept, SyncDiffEntry, walkSyncDiffEntriesDownToTop } from "@sync/sync-diff-entry";
import { isCleanLocalDiff, isCleanRemoteDiff, isConflictingDiff, SyncDiffType } from "@sync/sync-diff-type";
import { SyncOutlineEntry } from "@sync/sync-entry";
import { SyncTarget } from "@sync/sync-target";
import { SyncTargetProvider } from "@sync/sync-target-provider";
import { walkEntriesDownToTop } from "@sync/walk-entries-down-to-top";
import assert from "assert";
import { Mutex } from "async-mutex";
import * as mobx from "mobx";
import { ContentIdentity, DirContentIdentity, getContentIdentity, getContentIdentityForData } from "./content-identity";
import { EntryCompareData } from "./entry-compare-data";
import { DiffAction, EntrySyncMetadata, SyncMetadataMap, SyncMetadataStorage } from "./sync-metadata-storage";
import { count } from "@common/utils/count";


export type SyncUpdateCallback = (path: StoragePath, updatedIdentity: ContentIdentity | undefined, updatedData: Buffer | undefined) => void;


export class Sync {
  constructor(storage: EntryStorage, syncTarget: SyncTargetProvider) {
    this.storage = storage;
    this.syncTarget = syncTarget;

    this.localSyncTarget = new SyncTarget(this.storage);
    mobx.makeObservable(this, {
      actualDiff: mobx.observable,
      conflictCount: mobx.computed,
      unresolvedDiffCount: mobx.computed,
      updatingDiff: mobx.observable,
      mergeDiffsIntoActual: mobx.action
    } as any);
  }


  private readonly storage: EntryStorage;
  private readonly syncTarget: SyncTargetProvider;
  private readonly localSyncTarget: SyncTargetProvider;
  private syncMetadata: SyncMetadataStorage | undefined;
  private lock = new Mutex();
  private readonly activeJobPaths = new Set<string>();
  private cachedDiffRules: DiffHandleRule[] | undefined;
  private readonly updateCallbacks: SyncUpdateCallback[] = [];
  actualDiff: SyncDiffEntry[] = [];
  updatingDiff = false;


  addUpdateCallback(cb: SyncUpdateCallback | undefined) {
    if (cb) {
      this.updateCallbacks.push(cb);
    }
  }


  get unresolvedDiffCount() {
    return count(this.actualDiff, d => !isAccepted(d));
  }


  get conflictCount() {
    let count = 0;
    for (const diff of this.actualDiff) {
      if (isConflictingDiff(diff.type)) {
        ++count;
      }
    }

    return count;
  }


  private async getDiffHandleRules(): Promise<DiffHandleRule[]> {
    if (this.cachedDiffRules) {
      return this.cachedDiffRules;
    }

    const sd = new StorageSyncData(this.storage);
    const workspaceSettings = new WorkspaceSettingsProvider(this.storage);

    const [ sync, _ ] = await Promise.all([ sd.getConfig(), workspaceSettings.init() ]);
    const syncRules = sync?.diffRules || [];
    const wsRules = workspaceSettings.settings?.sync?.diffRules || [];

    this.cachedDiffRules = [
      ...wsRules,
      ...syncRules
    ];

    return this.cachedDiffRules;
  }


  private async getSyncMetadataStorage(): Promise<SyncMetadataStorage> {
    if (!this.syncMetadata) {
      let remoteStorageId: string | undefined;
      try {
        remoteStorageId = await this.syncTarget.getId();
      } catch (e: any) {
        throw new Error("Connection to remote storage failed: " + e.message);
      }

      const sd = new StorageSyncData(this.storage);
      this.syncMetadata = sd.getSyncMetadataStorageForRemoteStorage(remoteStorageId);
    }

    return this.syncMetadata;
  }


  /**
   * Returns difference between local and remote state.
   */
  private async getDiffs(remoteOutline: SyncOutlineEntry | undefined, start: StoragePath) {
    const allPaths = new Map<string, SyncOutlineEntry | undefined>();

    // walking through the remote outline top-down
    if (remoteOutline) {
      for (const [ path, outlineEntry ] of walkOutlineEntries(remoteOutline, start)) {
        allPaths.set(path.normalized, outlineEntry);
      }
    }

    // now walk local paths top-down and add entries missing from remote to the map
    for await (const ep of walkEntriesDownToTop(this.storage.get(start))) {
      if (!allPaths.has(ep.path.normalized) && shouldPathBeSynced(ep.path)) {
        allPaths.set(ep.path.normalized, undefined);
      }
    }

    await this.removeMetadataExcept(start, allPaths);

    let metadataStorage = await this.getSyncMetadataStorage();
    let metadata = await metadataStorage.get();

    const result: SyncDiffEntry[] = [];
    const nonConflicting = new Map<string, ContentIdentity>();
    // now iterate over the union of all local and remote paths. Order is not important here.
    for (const path of allPaths.keys()) {
      const { diff, actual: actualIdentity } = await this.getEntryDiff(new StoragePath(path), allPaths.get(path), metadata);
      if (diff) {
        result.push(diff);
      } else if (actualIdentity) {
        nonConflicting.set(path, actualIdentity);
      }
    }

    const updatedMeta: SyncMetadataMap = {};
    for (const [ path, actual ] of nonConflicting.entries()) {
      if (!(path in metadata)) {
        updatedMeta[path] = {
          synced: actual,
          accepted: actual,
          action: undefined,
          diff: undefined
        };
      }
    }
    await metadataStorage.setMulti(updatedMeta);

    return result;
  }


  async accept(diff: SyncDiffEntry, action: DiffAction) {
    const release = await this.lock.acquire();
    try {
      await this.acceptInsideLock(diff, action);
    } finally {
      release();
    }
  }


  private async acceptInsideLock(diff: SyncDiffEntry, action: DiffAction) {
    if (action === DiffAction.AcceptAuto && isConflictingDiff(diff.type)) {
      throw new Error("Cannot resolve conflicting diff with DiffAction.AcceptAuto");
    } else if (!isConflictingDiff(diff.type) && (action === DiffAction.AcceptLocal || action === DiffAction.AcceptRemote)) {
      throw new Error("Cannot resolve clean diff with DiffAction.AcceptLocal or DiffAction.AcceptRemote");
    }

    let updatedMeta: EntrySyncMetadata | undefined;
    await (await this.getSyncMetadataStorage()).updateSingle(diff.path, meta => {
      updatedMeta = {
        synced: meta?.synced,
        accepted: getAcceptedContentIdentity(diff, action),
        action: action,
        diff: diff.type
      };

      return updatedMeta;
    });

    if (updatedMeta) {
      diff.syncMetadata = updatedMeta;
    }
  }


  async acceptMulti(entries: Omit<SyncDiffEntry, "syncMetadata">[]): Promise<void> {
    const release = await this.lock.acquire();
    try {
      const sm = await this.getSyncMetadataStorage();
      const meta = await sm.get();
      const result: SyncMetadataMap = {};
      const updatedMeta = new Map<string, EntrySyncMetadata>();

      for (const entryDiff of entries) {
        let entryMeta = meta[entryDiff.path.normalized];
        if (entryMeta) {
          entryMeta.accepted = getAcceptedContentIdentity(entryDiff, DiffAction.AcceptAuto);
          entryMeta.action = DiffAction.AcceptAuto;
          entryMeta.diff = entryDiff.type;
        } else {
          entryMeta = {
            accepted: getAcceptedContentIdentity(entryDiff, DiffAction.AcceptAuto),
            synced: undefined,
            action: DiffAction.AcceptAuto,
            diff: entryDiff.type
          };
        }

        result[entryDiff.path.normalized] = entryMeta;
        updatedMeta.set(entryDiff.path.normalized, entryMeta);
      }

      await sm.setMulti(result);

      for (const diff of this.actualDiff) {
        const updatedEntryMeta = updatedMeta.get(diff.path.normalized);
        if (updatedEntryMeta) {
          diff.syncMetadata = updatedEntryMeta;
        }
      }
    } finally {
      release();
    }
  }


  async getCompareData(path: StoragePath): Promise<EntryCompareData> {
    async function guardedLoad(cb: () => Promise<Buffer | undefined>) {
      try {
        return await cb();
      } catch (err) {
        if (err instanceof StorageError && (err.code === StorageErrorCode.NotExists || err.code === StorageErrorCode.NotFile)) {
          return undefined;
        } else {
          throw err;
        }
      }
    }

    let local = await guardedLoad(() => this.storage.read(path));
    let remote = await guardedLoad(() => this.syncTarget.read(path));

    return {
      local,
      remote
    };
  }


  async updateDiff(start: StoragePath = StoragePath.root): Promise<void> {
    if (!shouldPathBeSynced(start)) {
      return;
    }

    this.updatingDiff = true;
    try {
      const outline = await this.loadOutline(start);

      const release = await this.lock.acquire();
      try {
        const diffs = await this.getDiffs(outline, start);
        await this.handleDiffs(diffs);
        this.mergeDiffsIntoActual(start, diffs);
      } finally {
        release();
      }
    } finally {
      this.updatingDiff = false;
    }
  }


  /**
   * Removes keys from the metadata map that are not present in the allPaths map.
   * This is required before calculating diff because metadata map can have keys for previously accepted, but deleted entries.
   */
  private async removeMetadataExcept(start: StoragePath, exceptPaths: Map<string, SyncOutlineEntry | undefined>) {
    const sm = await this.getSyncMetadataStorage();
    const meta = await sm.get();

    const toDelete: SyncMetadataMap = {};
    // iterate over keys and remove those that are not in allPaths
    for (const [ key, value ] of Object.entries(meta)) {
      if (!exceptPaths.has(key) && new StoragePath(key).inside(start)) {
        if (value && value.accepted && value.accepted !== value.synced) {
          console.log(`Accepted state is lost: ${ key } (accepted identity is ${ value.accepted })`);
        }

        toDelete[key] = undefined;
      }
    }

    await sm.setMulti(toDelete);

    this.actualDiff = this.actualDiff.filter(diff => !(diff.path.normalized in toDelete));
  }


  private mergeDiffsIntoActual(start: StoragePath, diffs: SyncDiffEntry[]): void {
    for (const d of diffs) {
      this.actualDiff = this.actualDiff.filter(e => !e.path.isEqual(d.path));
      this.actualDiff.push(d);
    }

    // remove entries that are under start path but not in new diff
    this.actualDiff = this.actualDiff.filter(e => !e.path.inside(start) || diffs.some(d => d.path.isEqual(e.path)));
  }


  private async handleDiffs(diffs: SyncDiffEntry[]): Promise<void> {
    for (const diff of diffs) {
      const rule = await this.findDiffHandleRule(diff);
      if (rule) {
        await this.acceptInsideLock(diff, rule.action);
      }
    }
  }


  private async findDiffHandleRule(diff: SyncDiffEntry): Promise<DiffHandleRule | undefined> {
    function diffRuleMatches(diffRule: SyncDiffType | SyncDiffType[]) {
      return Array.isArray(diffRule) ? diffRule.includes(diff.type) : diffRule === diff.type;
    }

    const rules = await this.getDiffHandleRules();
    return rules.find(rule => {
      if (!rule.files && !rule.diff) {
        return false;
      }

      if (rule.files && !patternMatches(diff.path, rule.files)) {
        return false;
      }

      if (rule.diff && !diffRuleMatches(rule.diff)) {
        return false;
      }

      return true;
    });
  }


  async getJobs(count: number, filter?: (job: StoragePath) => boolean): Promise<SyncDiffEntry[]> {
    if (count <= 0) {
      return [];
    }

    const result: SyncDiffEntry[] = [];

    const release = await this.lock.acquire();
    try {
      for (const diff of walkSyncDiffEntriesDownToTop(this.actualDiff)) {
        if (!diff.syncMetadata || !diff.syncMetadata.action || !diff.syncMetadata.diff) {
          continue;
        }

        const isSynced = diff.syncMetadata.accepted === diff.syncMetadata.synced;
        const isWorkingOn = this.activeJobPaths.has(diff.path.normalized);

        if (!isSynced && !isWorkingOn && (!filter || filter(diff.path))) {
          result.push(diff);
          if (result.length >= count) {
            break;
          }
        }
      }

      return result;
    } finally {
      release();
    }
  }


  async doJob(job: SyncDiffEntry): Promise<void> {
    if (this.activeJobPaths.has(job.path.normalized)) {
      throw new Error("Job for given path is already active");
    }

    if (!job.syncMetadata || !job.syncMetadata.action || !job.syncMetadata.diff) {
      throw new Error("Invariant error: malformed job");
    }

    this.activeJobPaths.add(job.path.normalized);
    try {
      const readLocal = shouldReadFromLocalToAccept(job.syncMetadata);
      assert(readLocal != null, "shouldReadFromLocalToAccept should not return undefined");

      const to = readLocal ? this.syncTarget : this.localSyncTarget;
      const from = readLocal ? this.localSyncTarget : this.syncTarget;

      let accepted = job.syncMetadata.accepted;
      let synced = job.syncMetadata.synced;
      if (accepted) {
        if (accepted === DirContentIdentity) {
          await to.createDir(job.path, synced);

          if (to === this.localSyncTarget) {
            this.updateCallbacks.forEach(c => c(job.path, DirContentIdentity, undefined));
          }
        } else {
          let data: Buffer;

          try {
            data = await from.read(job.path);
          } catch (err) {
            if (err instanceof StorageError && err.code === StorageErrorCode.NotExists) {
              await this.onIdentityChange(job.path, undefined, readLocal);
              return;
            } else if (err instanceof StorageError && err.code === StorageErrorCode.NotFile) {
              await this.onIdentityChange(job.path, DirContentIdentity, readLocal);
              return;
            } else {
              throw err;
            }
          }

          // after async read accepted state could have been changed, so we should check it again
          const actual = getContentIdentityForData(data);
          if (actual !== accepted) {
            await this.onIdentityChange(job.path, actual, readLocal);
            return;
          }

          await to.update(job.path, data, synced);

          if (to === this.localSyncTarget) {
            this.updateCallbacks.forEach(c => c(job.path, actual, data));
          }
        }
      } else {
        if (!synced) {
          throw new Error("Invariant error: job.syncMetadata.synced is undefined when trying to remove a remote entry");
        }

        await to.remove(job.path, synced);

        if (to === this.localSyncTarget) {
          this.updateCallbacks.forEach(c => c(job.path, undefined, undefined));
        }
      }

      const release = await this.lock.acquire();
      try {
        let updatedMeta: EntrySyncMetadata | undefined;
        await (await this.getSyncMetadataStorage()).updateSingle(job.path, meta => {
          if (meta && meta.synced === synced) {
            updatedMeta = { ...meta, synced: accepted || undefined, action: undefined, diff: undefined };
          } else {
            updatedMeta = meta;
          }
          return updatedMeta;
        });

        // update actualDiff with new sync metadata
        if (updatedMeta) {
          this.actualDiff = this.actualDiff.filter(d => !d.path.isEqual(job.path));
        }
      } finally {
        release();
      }
    } finally {
      this.activeJobPaths.delete(job.path.normalized);
    }
  }


  private getDiffType(local: ContentIdentity | undefined, synced: ContentIdentity | undefined | false, remote: ContentIdentity | undefined): SyncDiffType | undefined {
    if (local && remote) {
      // both local and remote exists
      if (!synced) {
        // but the entry was not present on last sync, so it was created locally after sync (and remotely)
        // this can also happen in case of first sync when we have no sync metadata

        // creating two files with identical content is also ok (or two directories)
        if (local === remote) {
          return undefined;
        }

        return SyncDiffType.ConflictingCreate;
      }

      // both local and remote exist and the entry was present on last sync
      if (local === remote) {
        // no changes since last sync (or remote was overwritten with same content)
        return undefined;
      } else if (synced === remote) {
        // local was overwritten after sync
        return SyncDiffType.LocalUpdate;
      } else if (local === synced) {
        return SyncDiffType.RemoteUpdate;
      } else {
        // local was updated locally, but remote was updated too
        return SyncDiffType.ConflictingUpdate;
      }
    } else if (!local && remote) {
      // local file does not exists, but remote exists
      if (!synced) {
        // the entry was created on remote after sync
        // or this is the first sync
        return SyncDiffType.RemoteCreate;
      } else if (synced === remote) {
        // the entry was removed locally after sync
        return SyncDiffType.LocalRemove;
      } else {
        // the entry was removed locally, but remote was modified after last sync
        return SyncDiffType.ConflictingLocalRemove;
      }
    } else if (local && !remote) {
      // local file exists, but remote does not exist
      if (!synced) {
        // the entry was created on local after sync
        // or this is the first sync
        return SyncDiffType.LocalCreate;
      } else if (synced === local) {
        // the entry was removed remotely after sync, and local entry was not changed after sync
        return SyncDiffType.RemoteRemove;
      } else {
        // the entry was removed remotely, but local was modified after last sync
        return SyncDiffType.ConflictingRemoteRemove;
      }
    } else {
      // local and remote do not exist -- no entries, no problems
      return undefined;
    }
  }


  private async getEntryDiff(path: StoragePath, remote: SyncOutlineEntry | undefined, metadataMap: SyncMetadataMap) {
    if (path.isEqual(StoragePath.root)) {
      return {
        diff: undefined,
        actual: DirContentIdentity
      };
    }

    const meta = metadataMap[path.normalized];
    const actual = await getContentIdentity(this.storage.get(path));

    const diffType = this.getDiffType(actual, meta?.synced, remote?.identity);

    return {
      diff: diffType && { path, type: diffType, actual, remote: remote?.identity, syncMetadata: meta },
      actual
    };
  }


  private async loadOutline(start: StoragePath) {
    return this.syncTarget.getOutline(start);
  }


  /**
   * Should not be called with locked mutex.
   * Updates diff entry when entry identity changes (on local or remote)
   */
  private async onIdentityChange(path: StoragePath, newIdentity: ContentIdentity | undefined, isLocal: boolean) {
    const release = await this.lock.acquire();

    try {
      const diff = this.actualDiff.find(d => d.path.isEqual(path));
      if (!diff) {
        return;
      }

      let shouldRecompute = false;
      if (isLocal && diff.actual !== newIdentity) {
        diff.actual = newIdentity;
        shouldRecompute = true;
      } else if (!isLocal && diff.remote !== newIdentity) {
        diff.remote = newIdentity;
        shouldRecompute = true;
      }

      if (shouldRecompute) {
        const diffType = this.getDiffType(diff.actual, diff.syncMetadata?.synced, diff.remote);
        if (diffType) {
          diff.type = diffType;
          await this.handleDiffs([ diff ]);
        } else {
          this.actualDiff = this.actualDiff.filter(d => !d.path.isEqual(path));

          const sm = await this.getSyncMetadataStorage();
          await sm.setMulti({
            [path.normalized]: undefined
          });
        }
      }
    } finally {
      release();
    }
  }
}


function* walkOutlineEntries(outline: SyncOutlineEntry, startPath: StoragePath): Generator<[ StoragePath, SyncOutlineEntry ]> {
  yield [ startPath, outline ];

  for (const child of outline.children || []) {
    yield* walkOutlineEntries(child, startPath.child(child.name));
  }
}


function getAcceptedContentIdentity(diff: Omit<SyncDiffEntry, "syncMetadata">, action: DiffAction): ContentIdentity | undefined {
  if ((action === DiffAction.AcceptAuto && isCleanRemoteDiff(diff.type)) || action === DiffAction.AcceptRemote) {
    return diff.remote;
  } else if ((action === DiffAction.AcceptAuto && isCleanLocalDiff(diff.type)) || action == DiffAction.AcceptLocal) {
    return diff.actual;
  } else {
    throw new Error("Invariant error: getAcceptedContentIdentity called with invalid action");
  }
}
