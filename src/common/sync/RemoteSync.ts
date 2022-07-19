import assert from "assert";
import { StorageEntryPointer, StorageError, StorageErrorCode, StorageLayer } from "../storage/StorageLayer";
import { StoragePath } from "../storage/StoragePath";
import { ContentIdentity, getContentIdentity, isContentIdentityEqual, isDirIdentity } from "./ContentIdentity";
import { SyncEntry, walkSyncEntriesDownToTop } from "./SyncEntry";


export enum DiffType {
  LocalUpdate = "iu",
  RemoteUpdate = "ru",
  ConflictingUpdate = "cu",

  LocalCreate = "lc",
  RemoteCreate = "rc",
  ConflictingCreate = "cc",

  LocalRemove = "lr",
  ConflictingLocalRemove = "clr",
  RemoteRemove = "rr",
  ConflictingRemoteRemove = "crr",
}


/**
 * Calculates a difference between a local and a remote entry.
 * Content identity is a value that helps to determine if contents of a file was changed.
 */
async function getEntryDiff(local: SyncEntry | undefined, remote: StorageEntryPointer): Promise<DiffType | undefined> {
  const remoteIdentity = await getContentIdentity(remote);
  if (local && local.identity && remoteIdentity) {
    if (!local.synced) {
      // - two files with same names are created both on local and remote
      // - the client has corrupted metadata (or this is initial sync)

      // creating two directories is always ok
      const outIsDir = (await remote.stats()).isDirectory;
      if (isDirIdentity(local.identity) && outIsDir) {
        return undefined;
      }

      // creating two files with identical content is also ok
      if (isContentIdentityEqual(local.identity, remoteIdentity)) {
        return undefined;
      }

      return DiffType.ConflictingCreate;
    }

    if (isContentIdentityEqual(local.identity, remoteIdentity)) {
      // no changes since last sync
      return undefined;
    } else if (isContentIdentityEqual(local.synced, remoteIdentity)) {
      // file is updated locally, we can safely update remote
      return DiffType.LocalUpdate;
    } else if (isContentIdentityEqual(local.synced, local.identity)) {
      // local file was not changed since last sync, but it was updated remotely
      // we can safely update local file
      return DiffType.RemoteUpdate;
    } else {
      // file is updated locally, but synced hash does not match remote
      return DiffType.ConflictingUpdate;
    }
  } else if (!local?.identity && remoteIdentity) {
    if (!local?.synced) {
      // - the entry was created on remote and missing on local
      // - client has corrupted metata (or this is initial sync)
      return DiffType.RemoteCreate;
    }

    if (isContentIdentityEqual(local.synced, remoteIdentity)) {
      return DiffType.LocalRemove;
    } else {
      return DiffType.ConflictingLocalRemove;
    }
  } else if (local && local.identity && !remoteIdentity) {
    if (!local.synced) {
      return DiffType.LocalCreate;
    }

    if (isContentIdentityEqual(local.synced, local.identity)) {
      return DiffType.RemoteRemove;
    } else {
      return DiffType.ConflictingRemoteRemove;
    }
  } else {
    // both local and remote are missing
    assert((local == null || local.identity == null) && remoteIdentity == null);
    return undefined;
  }
}


/**
 * Executes the following actions to sync a single entry (which can be a directory, and that results in syncing an entire tree of this directory):
 * - Calculates diff between two entries
 * - Performs actions required to sync on remote tree
 * - Returns actions required to be performed on local tree and information on changes made to the remote tree
 *
 * Actions required for a local tree can require user interaction, for example, asking to confirm or resolving a merge conflict.
 * Client can also be obliged to submit more data for the next sync.
 *
 * Local tree is represented by a collection of SyncEntry — a serializable structure that can hold local data, but can omit it.
 */
export async function syncRemoteEntry(local: SyncEntry, remote: StorageLayer) {
  const allPaths: string[] = []; // combination of all local and remote paths
  const localEntries = new Map<string, SyncEntry>(); // to speed-up lookup of local entries by path

  // collect all local paths
  for (const localEntry of walkSyncEntriesDownToTop(local)) {
    allPaths.push(localEntry.path.normalized);
    localEntries.set(localEntry.path.normalized, localEntry);
  }

  // add remote paths missing from already collected local paths
  for await (const entry of walkEntriesDownToTop(remote.get(local.path))) {
    if (!allPaths.includes(entry.path.normalized)) {
      allPaths.push(entry.path.normalized);
    }
  }

  const result: SyncResult[] = [];

  for (const entryPath of allPaths.values()) {
    const local = localEntries.get(entryPath);
    const remotePointer = remote.get(new StoragePath(entryPath));

    try {
      const diff = await getEntryDiff(local, remotePointer);
      if (diff) {
        result.push(await resolveDiff(diff, local, remotePointer, true));
      }
    } catch (err: any) {
      console.error(`Failed to process sync error: ${ err.message }`, err);
    }
  }

  return result;
}


export async function* walkEntriesDownToTop(entry: StorageEntryPointer): AsyncGenerator<StorageEntryPointer> {
  let isDir = false;
  try {
    const stats = await entry.stats();
    isDir = stats.isDirectory;
  } catch (err: unknown) {
    if (err instanceof StorageError && err.code === StorageErrorCode.NotExists) {
      return;
    } else {
      throw err;
    }
  }

  if (isDir) {
    for (const child of await entry.children()) {
      yield* await walkEntriesDownToTop(child);
    }
  }

  yield entry;
}


export enum SyncResultAction {
  Created = "created",
  Updated = "updated",
  Removed = "removed",
  CreateDataRequired = "create_data_required",
  UpdateDataRequired = "update_data_required",
  LocalUpdateRequired = "local_update_required",
  LocalCreateRequired = "local_create_required",
  LocalRemoveRequired = "local_remove_required",
}


export type SyncResult = {
  path: string;
  data: string | Buffer | undefined;
  identity: ContentIdentity | undefined;
} & ({
  conflict: DiffType;
} | {
  action: SyncResultAction;
});


async function writeEntry(output: StorageEntryPointer, data: string): Promise<ContentIdentity | undefined> {
  await output.writeOrCreate(data);
  return getContentIdentity(output);
}


async function createDir(p: StorageEntryPointer): Promise<ContentIdentity | undefined> {
  const storage = p.storage;
  return getContentIdentity(await storage.createDir(p.path));
}


async function readEntry(e: StorageEntryPointer): Promise<{ data: string | undefined, identity: ContentIdentity | undefined }> {
  try {
    const data = await e.readText();
    return { data, identity: await getContentIdentity(e, data) };
  } catch (err: unknown) {
    if (err instanceof StorageError && err.code === StorageErrorCode.NotFile) {
      return { data: undefined, identity: await getContentIdentity(e, undefined) };
    } else {
      throw err;
    }
  }
}


export async function resolveDiff(diff: DiffType,
                                  input: SyncEntry | undefined,
                                  remote: StorageEntryPointer,
                                  performUnsafeOperations: boolean): Promise<SyncResult> {
  switch (diff) {
    case DiffType.LocalUpdate:
      // replace output with input data
      assert(input != null);
      if (input.data) {
        return {
          path: remote.path.normalized,
          action: SyncResultAction.Updated,
          identity: await writeEntry(remote, input.data),
          data: undefined
        };
      } else if (input.identity && isDirIdentity(input.identity)) {
        // we have a directory created locally, but we have a file here on the remote
        await remote.remove();
        return {
          path: remote.path.normalized,
          action: SyncResultAction.Updated,
          identity: await createDir(remote),
          data: undefined
        };
      } else {
        return {
          path: remote.path.normalized,
          action: SyncResultAction.UpdateDataRequired,
          identity: undefined,
          data: undefined
        };
      }

    case DiffType.RemoteUpdate:
      // replace local with remote data
      return {
        path: remote.path.normalized,
        action: SyncResultAction.LocalUpdateRequired,
        ...await readEntry(remote)
      };

    case DiffType.ConflictingUpdate:
      return {
        path: remote.path.normalized,
        conflict: diff,
        ...await readEntry(remote)
      };

    case DiffType.LocalCreate:
      // create remote with local data
      assert(input != null);
      if (!isDirIdentity(input.identity) && input.data != null) {
        return {
          path: remote.path.normalized,
          action: SyncResultAction.Created,
          identity: await writeEntry(remote, input.data),
          data: undefined
        };
      } else if (isDirIdentity(input.identity)) {
        return {
          path: remote.path.normalized,
          action: SyncResultAction.Created,
          identity: await createDir(remote),
          data: undefined
        };
      } else {
        return {
          path: remote.path.normalized,
          action: SyncResultAction.CreateDataRequired,
          identity: undefined,
          data: undefined
        };
      }

    case DiffType.RemoteCreate:
      // create local with remote data
      return {
        path: remote.path.normalized,
        action: SyncResultAction.LocalCreateRequired,
        ...await readEntry(remote)
      };

    case DiffType.ConflictingCreate:
      return {
        path: remote.path.normalized,
        conflict: diff,
        ...await readEntry(remote)
      };

    case DiffType.LocalRemove:
      if (performUnsafeOperations) {
        await remote.remove();
        return {
          path: remote.path.normalized,
          conflict: undefined,
          action: SyncResultAction.Removed,
          data: undefined,
          identity: undefined
        };
      } else {
        return {
          path: remote.path.normalized,
          conflict: diff,
          data: undefined,
          identity: undefined
        };
      }

    case DiffType.ConflictingLocalRemove:
      return {
        path: remote.path.normalized,
        conflict: diff,
        ...await readEntry(remote)
      };

    case DiffType.RemoteRemove:
      return {
        path: remote.path.normalized,
        conflict: undefined,
        action: SyncResultAction.LocalRemoveRequired,
        data: undefined,
        identity: undefined
      };

    case DiffType.ConflictingRemoteRemove:
      return {
        path: remote.path.normalized,
        conflict: diff,
        data: undefined,
        identity: undefined
      };
  }
}
