import { RemoteSyncWorker } from "@sync/RemoteSyncWorker";
import * as mobx from "mobx";
import { StorageLayer } from "@storage/StorageLayer";
import { StoragePath } from "@storage/StoragePath";
import { RemoteSyncProvider } from "@sync/RemoteSyncProvider";
import { SyncDiffEntry } from "@sync/SyncDiffEntry";
import { SyncOutlineEntry } from "@sync/SyncEntry";
import { walkEntriesDownToTop } from "@sync/WalkEntriesDownToTop";
import { ContentIdentity, DirContentIdentity, getContentIdentity, getContentIdentityForData } from "./ContentIdentity";
import { EntrySyncMetadata, SyncMetadataMap, SyncMetadataStorage, walkSyncMetadataTopDown } from "./SyncMetadataStorage";


export enum SyncDiffType {
  ConflictingCreate = "conflicting_create",
  ConflictingUpdate = "conflicting_update",
  LocalUpdate = "local_update",
  RemoteCreate = "remote_create",
  LocalRemove = "local_remove",
  ConflictingLocalRemove = "conflicting_local_remove",
  LocalCreate = "local_create",
  RemoteRemove = "remote_remove",
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


export interface SyncJob {
  path: StoragePath;
  syncMetadata: EntrySyncMetadata;
}


export enum DiffHandleAction {
  AcceptLocal = "accept_local",
  AcceptRemote = "accept_remote"
}


export interface DiffHandleRule {
  diff: SyncDiffType;
  action: DiffHandleAction;
}


export class LocalSyncWorker {
  constructor(local: StorageLayer, syncProvider: RemoteSyncProvider, syncMetadata: SyncMetadataStorage) {
    this.local = local;
    this.remoteSyncProvider = syncProvider;
    this.syncMetadata = syncMetadata;

    // todo: rename
    this.localSyncProvider = new RemoteSyncWorker(this.local);
    mobx.makeObservable(this, {
      actualDiff: mobx.observable,
      mergeDiff: mobx.action,
    } as any);
  }


  private readonly local: StorageLayer;
  private readonly remoteSyncProvider: RemoteSyncProvider;
  private readonly localSyncProvider: RemoteSyncProvider;
  private readonly syncMetadata: SyncMetadataStorage;
  diffHandleRules: DiffHandleRule[] | undefined;
  actualDiff: SyncDiffEntry[] = [];


  /**
   * Returns difference between local and remote state.
   * @param start
   */
  async getDiff(start: StoragePath): Promise<SyncDiffEntry[]> {
    const remoteOutline = await this.loadOutline(start);

    const allPaths = new Map<string, SyncOutlineEntry | undefined>();

    // walking through the remote outline top-down
    if (remoteOutline) {
      for (const [ path, outlineEntry ] of walkOutlineEntries(remoteOutline, start)) {
        allPaths.set(path.normalized, outlineEntry);
      }
    }

    // now walk local paths top-down and add entries missing from remote to the map
    for await (const ep of walkEntriesDownToTop(this.local.get(start))) {
      if (!allPaths.has(ep.path.normalized)) {
        allPaths.set(ep.path.normalized, undefined);
      }
    }

    const metadataMap = await this.syncMetadata.get();

    const result: SyncDiffEntry[] = [];
    // now iterate over the union of all local and remote paths. Order is not important here.
    for (const path of allPaths.keys()) {
      const diff = await this.getEntryDiff(new StoragePath(path), allPaths.get(path), metadataMap);
      if (diff) {
        result.push(diff);
      }
    }

    return result;
  }


  async accept(path: StoragePath, identity: ContentIdentity | undefined, acceptRemote: boolean) {
    let updatedMeta: EntrySyncMetadata | undefined;

    await this.syncMetadata.update(path, meta => {
      updatedMeta = {
        synced: meta?.synced,
        accepted: identity,
        acceptedRemote: acceptRemote
      };
      return updatedMeta;
    });

    if (updatedMeta) {
      for (const diff of this.actualDiff) {
        if (diff.path.isEqual(path)) {
          diff.syncMetadata = updatedMeta!;
        }
      }
    }
  }


  async acceptMulti(identities: Record<string, ContentIdentity | undefined>, acceptRemote: boolean): Promise<void> {
    const meta = await this.syncMetadata.get();
    const result: SyncMetadataMap = {};

    for (const key of Object.keys(identities)) {
      let existing = meta[key];
      if (existing) {
        existing.accepted = identities[key];
        existing.acceptedRemote = acceptRemote;
      } else {
        existing = {
          accepted: identities[key],
          synced: undefined,
          acceptedRemote: acceptRemote
        };
      }

      result[key] = existing;
    }

    await this.syncMetadata.setMulti(result);

    for (const diff of this.actualDiff) {
      const key = diff.path.normalized;
      if (key in identities) {
        if (diff.syncMetadata) {
          diff.syncMetadata.accepted = identities[key];
          diff.syncMetadata.acceptedRemote = acceptRemote;
        } else {
          diff.syncMetadata = {
            accepted: identities[key],
            synced: undefined,
            acceptedRemote: acceptRemote
          };
        }
      }
    }
  }


  async updateDiff(start: StoragePath): Promise<void> {
    const diff = await this.getDiff(start);
    this.mergeDiff(diff);
    await this.handleDiff(diff);
  }


  private mergeDiff(diff: SyncDiffEntry[]): void {
    for (const d of diff) {
      this.actualDiff = this.actualDiff.filter(e => !e.path.isEqual(d.path));
      this.actualDiff.push(d);
    }
  }


  private async handleDiff(diffs: SyncDiffEntry[]): Promise<void> {
    for (const diff of diffs) {
      const rule = this.findDiffHandleRule(diff);
      if (rule && rule.action === DiffHandleAction.AcceptLocal) {
        await this.accept(diff.path, diff.actual, false);
      } else if (rule && rule.action === DiffHandleAction.AcceptRemote) {
        await this.accept(diff.path, diff.actual, true);
      }
    }
  }


  private findDiffHandleRule(diff: SyncDiffEntry): DiffHandleRule | undefined {
    return this.diffHandleRules?.find(r => r.diff === diff.diff);
  }


  async getJobs(count: number, filter?: (job: StoragePath) => boolean): Promise<SyncJob[]> {
    if (count <= 0) {
      return [];
    }

    const result: SyncJob[] = [];

    const metadata = await this.syncMetadata.get();
    for (const [ path, entry ] of walkSyncMetadataTopDown(metadata)) {
      if (entry.synced !== entry.accepted && (!filter || filter(path))) {
        result.push({ path, syncMetadata: entry });
        if (result.length >= count) {
          break;
        }
      }
    }

    return result;
  }


  async doJob(job: SyncJob): Promise<void> {
    let accepted = job.syncMetadata.accepted;
    let synced = job.syncMetadata.synced;

    const to = job.syncMetadata.acceptedRemote ? this.localSyncProvider : this.remoteSyncProvider;
    const from = job.syncMetadata.acceptedRemote ? this.remoteSyncProvider : this.localSyncProvider;

    if (accepted) {
      if (accepted === DirContentIdentity) {
        await this.remoteSyncProvider.createDir(job.path, synced);
      } else {
        const data = await from.read(job.path);
        const contentIdentity = await getContentIdentityForData(data);
        if (contentIdentity !== accepted) {
          throw new Error("Data is updated after accepting");
        }

        await to.update(job.path, data, synced);
      }
    } else if (accepted === false) {
      if (!synced) {
        throw new Error("Invariant error: job.syncMetadata.synced is undefined when trying to remove a remote entry");
      }

      await to.remove(job.path, synced);
    }

    let updatedMeta: EntrySyncMetadata | undefined;
    await this.syncMetadata.update(job.path, meta => {
      if (meta && meta?.synced === synced) {
        updatedMeta = { ...meta, synced: accepted || undefined };
      } else {
        console.error("Race condition: sync metadata changed after while job was performing: " + job.path.normalized);
        updatedMeta = meta;
      }
      return updatedMeta;
    });

    // updated actualDiff with new sync metadata
    if (updatedMeta) {
      for (const diff of this.actualDiff) {
        if (diff.path.isEqual(job.path)) {
          diff.syncMetadata = updatedMeta;
        }
      }

      this.actualDiff = this.actualDiff.filter(d => d.syncMetadata?.synced !== d.syncMetadata?.accepted);
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


  private async getEntryDiff(path: StoragePath, remote: SyncOutlineEntry | undefined, metadataMap: SyncMetadataMap): Promise<SyncDiffEntry | undefined> {
    if (path.isEqual(StoragePath.root)) {
      return undefined;
    }

    const meta = metadataMap[path.normalized];
    const synced = meta?.synced;
    const actual = await getContentIdentity(this.local.get(path));

    const actualDiff = this.getEntryIdentityDiff(actual, synced, remote?.identity);

    return actualDiff && { path, diff: actualDiff, actual, remote: remote?.identity, syncMetadata: meta! };
  }


  private async loadOutline(start: StoragePath) {
    return this.remoteSyncProvider.getOutline(start);
  }
}


function* walkOutlineEntries(outline: SyncOutlineEntry, startPath: StoragePath): Generator<[ StoragePath, SyncOutlineEntry ]> {
  yield [ startPath, outline ];

  for (const child of outline.children || []) {
    yield* walkOutlineEntries(child, startPath.child(child.name));
  }
}