import { patternMatches } from "@common/utils/patterns";
import { timeout } from "@common/utils/timeout";
import { WorkspaceSettingsProvider } from "@storage/workspace-settings-provider";
import { shouldPathBeSynced } from "@sync/Ignore";
import { DiffHandleRule, StorageSyncData } from "@sync/StorageSyncData";
import { StorageError, StorageErrorCode, EntryStorage } from "@storage/entry-storage";
import { StoragePath } from "@storage/storage-path";
import { SyncTargetProvider } from "@sync/SyncTargetProvider";
import { SyncTarget } from "@sync/SyncTarget";
import { SyncDiffEntry } from "@sync/SyncDiffEntry";
import { SyncOutlineEntry } from "@sync/SyncEntry";
import { walkEntriesDownToTop } from "@sync/WalkEntriesDownToTop";
import * as mobx from "mobx";
import { ContentIdentity, DirContentIdentity, getContentIdentity, getContentIdentityForData } from "./ContentIdentity";
import { EntryCompareData } from "./EntryCompareData";
import { DiffAction, EntrySyncMetadata, SyncMetadataMap, SyncMetadataStorage, walkSyncMetadataTopDown } from "./SyncMetadataStorage";
import { Mutex } from "async-mutex";


export enum SyncDiffType {
  LocalCreate = "local_create",
  RemoteCreate = "remote_create",
  ConflictingCreate = "conflicting_create",
  LocalUpdate = "local_update",
  RemoteUpdate = "remote_update",
  ConflictingUpdate = "conflicting_update",
  LocalRemove = "local_remove",
  RemoteRemove = "remote_remove",
  ConflictingLocalRemove = "conflicting_local_remove",
  ConflictingRemoteRemove = "conflicting_remote_remove",
}


export function isConflictingDiff(diff: SyncDiffType): boolean {
  const conflictingTypes: SyncDiffType[] = [
    SyncDiffType.ConflictingCreate,
    SyncDiffType.ConflictingUpdate,
    SyncDiffType.ConflictingLocalRemove,
    SyncDiffType.ConflictingRemoteRemove,
  ];

  return conflictingTypes.includes(diff);
}


export function isCleanLocalDiff(diff: SyncDiffType): boolean {
  const localTypes: SyncDiffType[] = [
    SyncDiffType.LocalUpdate,
    SyncDiffType.LocalRemove,
    SyncDiffType.LocalCreate,
  ];

  return localTypes.includes(diff);
}


export function isCleanRemoteDiff(diff: SyncDiffType): boolean {
  const cleanRemoteTypes: SyncDiffType[] = [
    SyncDiffType.RemoteCreate,
    SyncDiffType.RemoteUpdate,
    SyncDiffType.RemoteRemove,
  ];

  return cleanRemoteTypes.includes(diff);
}


export interface SyncJob {
  path: StoragePath;
  syncMetadata: EntrySyncMetadata;
}


export class Sync {
  constructor(storage: EntryStorage, syncTarget: SyncTargetProvider) {
    this.storage = storage;
    this.syncTarget = syncTarget;

    this.localSyncTarget = new SyncTarget(this.storage);
    mobx.makeObservable(this, {
      actualDiff: mobx.observable,
      mergeDiff: mobx.action,
      conflictCount: mobx.computed,
      updatingDiff: mobx.observable
    } as any);
  }


  private readonly storage: EntryStorage;
  private readonly syncTarget: SyncTargetProvider;
  private readonly localSyncTarget: SyncTargetProvider;
  private syncMetadata: SyncMetadataStorage | undefined;
  private lock = new Mutex();
  private readonly activeJobPaths = new Set<string>();
  private cachedDiffRules: DiffHandleRule[] | undefined;
  actualDiff: SyncDiffEntry[] = [];
  updatingDiff = false;


  get cleanDiffCount() {
    return this.actualDiff.length - this.conflictCount;
  }


  get conflictCount() {
    let count = 0;
    for (const diff of this.actualDiff) {
      if (isConflictingDiff(diff.diff)) {
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
  private async getDiff(remoteOutline: SyncOutlineEntry | undefined, start: StoragePath) {
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

    await this.cleanMetadata(start, allPaths);

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

    metadata = await metadataStorage.get();
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


  async accept(diff: Omit<SyncDiffEntry, "syncMetadata">, action: DiffAction) {
    const release = await this.lock.acquire();
    try {
      await this.acceptInsideLock(diff, action)
    } finally {
      release();
    }
  }


  private async acceptInsideLock(diff: Omit<SyncDiffEntry, "syncMetadata">, action: DiffAction) {
    if (action === DiffAction.AcceptAuto && isConflictingDiff(diff.diff)) {
      throw new Error("Cannot resolve conflicting diff with DiffAction.AcceptAuto");
    } else if (!isConflictingDiff(diff.diff) && (action === DiffAction.AcceptLocal || action === DiffAction.AcceptRemote)) {
      throw new Error("Cannot resolve clean diff with DiffAction.AcceptLocal or DiffAction.AcceptRemote");
    }

    let updatedMeta: EntrySyncMetadata | undefined;
    await (await this.getSyncMetadataStorage()).update(diff.path, meta => {
      updatedMeta = {
        synced: meta?.synced,
        accepted: getAcceptedContentIdentity(diff, action),
        action: action,
        diff: diff.diff
      };
      return updatedMeta;
    });

    if (updatedMeta) {
      for (const diff of this.actualDiff) {
        if (diff.path.isEqual(diff.path)) {
          diff.syncMetadata = updatedMeta!;
        }
      }
    }
  }


  async acceptMulti(entries: Omit<SyncDiffEntry, "syncMetadata">[]): Promise<void> {
    const release = await this.lock.acquire();
    try {
      const meta = await (await this.getSyncMetadataStorage()).get();
      const result: SyncMetadataMap = {};
      const updatedMeta = new Map<string, EntrySyncMetadata>();

      for (const entryDiff of entries) {
        let entryMeta = meta[entryDiff.path.normalized];
        if (entryMeta) {
          entryMeta.accepted = getAcceptedContentIdentity(entryDiff, DiffAction.AcceptAuto);
          entryMeta.action = DiffAction.AcceptAuto;
          entryMeta.diff = entryDiff.diff;
        } else {
          entryMeta = {
            accepted: getAcceptedContentIdentity(entryDiff, DiffAction.AcceptAuto),
            synced: undefined,
            action: DiffAction.AcceptAuto,
            diff: entryDiff.diff
          };
        }

        result[entryDiff.path.normalized] = entryMeta;
        updatedMeta.set(entryDiff.path.normalized, entryMeta);
      }

      await (await this.getSyncMetadataStorage()).setMulti(result);

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
      const outline = await this.loadOutline(start)

      const release = await this.lock.acquire();
      try {
        const diff = await this.getDiff(outline, start);
        this.mergeDiff(start, diff);
        await this.handleDiff(diff);
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
  private async cleanMetadata(start: StoragePath, allPaths: Map<string, SyncOutlineEntry | undefined>) {
    const sm = await this.getSyncMetadataStorage();
    const meta = await sm.get();

    const toDelete: SyncMetadataMap = {};
    // iterate over keys and remove those that are not in allPaths
    for (const key of Object.keys(meta)) {
      if (!allPaths.has(key) && new StoragePath(key).inside(start)) {
        const value = meta[key]!;
        if (value.accepted && value.accepted !== value.synced) {
          console.log(`Accepted state is lost: ${ key } (accepted identity is ${ value.accepted })`);
        }

        toDelete[key] = undefined;
      }
    }

    await sm.setMulti(toDelete);
  }


  private mergeDiff(start: StoragePath, diff: SyncDiffEntry[]): void {
    for (const d of diff) {
      this.actualDiff = this.actualDiff.filter(e => !e.path.isEqual(d.path));
      this.actualDiff.push(d);
    }

    // remove entries that are under start path but not in new diff
    this.actualDiff = this.actualDiff.filter(e => !e.path.inside(start) || diff.some(d => d.path.isEqual(e.path)));
  }


  private async handleDiff(diffs: SyncDiffEntry[]): Promise<void> {
    for (const diff of diffs) {
      const rule = await this.findDiffHandleRule(diff);
      if (rule) {
        await this.acceptInsideLock(diff, rule.action);
      }
    }
  }


  private async findDiffHandleRule(diff: SyncDiffEntry): Promise<DiffHandleRule | undefined> {
    function diffRuleMatches(diffRule: SyncDiffType | SyncDiffType[]) {
      return Array.isArray(diffRule) ? diffRule.includes(diff.diff) : diffRule === diff.diff;
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


  async getJobs(count: number, filter?: (job: StoragePath) => boolean): Promise<SyncJob[]> {
    if (count <= 0) {
      return [];
    }

    const result: SyncJob[] = [];

    const metadata = await (await this.getSyncMetadataStorage()).get();
    for (const [ path, entry ] of walkSyncMetadataTopDown(metadata)) {
      if (entry.synced !== entry.accepted && !this.activeJobPaths.has(path.normalized) && (!filter || filter(path))) {
        result.push({ path, syncMetadata: entry });
        if (result.length >= count) {
          break;
        }
      }
    }

    return result;
  }


  async doJob(job: SyncJob): Promise<void> {
    if (this.activeJobPaths.has(job.path.normalized)) {
      throw new Error("Job for given path is already active");
    }

    if (!job.syncMetadata.diff) {
      throw new Error("Invariant error: job without diff");
    }

    this.activeJobPaths.add(job.path.normalized);
    try {
      const action = job.syncMetadata.action;

      let to: SyncTargetProvider, from: SyncTargetProvider;
      if (isConflictingDiff(job.syncMetadata.diff)) {
        to = action === DiffAction.AcceptLocal ? this.syncTarget : this.localSyncTarget;
        from = action === DiffAction.AcceptLocal ? this.localSyncTarget : this.syncTarget;
      } else if (isCleanLocalDiff(job.syncMetadata.diff)) {
        to = this.syncTarget;
        from = this.localSyncTarget;
      } else {
        to = this.localSyncTarget;
        from = this.syncTarget;
      }

      let accepted = job.syncMetadata.accepted;
      let synced = job.syncMetadata.synced;
      if (accepted) {
        if (accepted === DirContentIdentity) {
          await this.syncTarget.createDir(job.path, synced);
        } else {
          const data = await from.read(job.path);

          // after async read accepted state could have been changed, so we should check it again
          const contentIdentity = getContentIdentityForData(data);
          if (contentIdentity !== accepted) {
            // just do nothing, this job should be re-run later
            return;
          }

          await to.update(job.path, data, synced);
        }
      } else {
        if (!synced) {
          throw new Error("Invariant error: job.syncMetadata.synced is undefined when trying to remove a remote entry");
        }

        await to.remove(job.path, synced);
      }

      let updatedMeta: EntrySyncMetadata | undefined;
      await (await this.getSyncMetadataStorage()).update(job.path, meta => {
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
      this.activeJobPaths.delete(job.path.normalized);
    }
  }


  private getEntryIdentityDiff(local: ContentIdentity | undefined, synced: ContentIdentity | undefined | false, remote: ContentIdentity | undefined): SyncDiffType | undefined {
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
    const synced = meta?.synced;
    const actual = await getContentIdentity(this.storage.get(path));

    const actualDiff = this.getEntryIdentityDiff(actual, synced, remote?.identity);

    return {
      diff: actualDiff && { path, diff: actualDiff, actual, remote: remote?.identity, syncMetadata: meta! },
      actual
    };
  }


  private async loadOutline(start: StoragePath) {
    return this.syncTarget.getOutline(start);
  }
}


function* walkOutlineEntries(outline: SyncOutlineEntry, startPath: StoragePath): Generator<[ StoragePath, SyncOutlineEntry ]> {
  yield [ startPath, outline ];

  for (const child of outline.children || []) {
    yield* walkOutlineEntries(child, startPath.child(child.name));
  }
}


function getAcceptedContentIdentity(diff: Omit<SyncDiffEntry, "syncMetadata">, action: DiffAction): ContentIdentity | undefined {
  if ((action === DiffAction.AcceptAuto && isCleanRemoteDiff(diff.diff)) || action === DiffAction.AcceptRemote) {
    return diff.remote;
  } else if ((action === DiffAction.AcceptAuto && isCleanLocalDiff(diff.diff)) || action == DiffAction.AcceptLocal) {
    return diff.actual;
  } else {
    throw new Error("Invariant error: getAcceptedContentIdentity called with invalid action");
  }
}
