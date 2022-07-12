import { ContentIdentity, getContentIdentity, isContentIdentityEqual } from "./ContentIdentity";
import { StorageEntryPointer, StorageError, StorageErrorCode, StorageLayer } from "../storage/StorageLayer";
import { StoragePath } from "../storage/StoragePath";
import assert from "assert";


export enum DiffType {
  InputUpdate = "iu",
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


export interface SyncEntry {
  path: StoragePath;

  /**
   * Identity at the time it was last synced
   */
  synced?: ContentIdentity;

  /**
   * Identity now
   */
  identity?: ContentIdentity;

  isDir: boolean;
  children?: SyncEntry[];
  data?: string;
}


/**
 * Calculates a difference between a local and a remote entry.
 * Content identity is a value that helps to determine if contents of a file was changed.
 */
async function getEntryDiff(local: SyncEntry | undefined, remote: StorageEntryPointer): Promise<DiffType | undefined> {
  const remoteIdentity = await getContentIdentity(remote);
  if (local && local.identity && remoteIdentity) {
    // If we do not have local hash, we can either have corrupted metadata,
    // or two files with same names are created on local and on remote
    if (!local.synced) {
      const outIsDir = (await remote.stats()).isDirectory;
      if (local.isDir && outIsDir) {
        return undefined;
      }

      return DiffType.ConflictingCreate;
    }

    if (isContentIdentityEqual(local.identity, remoteIdentity)) {
      // no changes since last sync
      return undefined;
    } else if (isContentIdentityEqual(local.synced, remoteIdentity)) {
      // file is updated locally, we can safely update remote
      return DiffType.InputUpdate;
    } else {
      // file is updated locally, but synced hash does not match remote
      return DiffType.ConflictingUpdate;
    }
  } else if (!local?.identity && remoteIdentity) {
    if (!local?.synced) {
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
 * Calculates diff between two entries, performs actions required to sync on remote tree and returns actions required to be performed on local tree.
 * These actions can include user interaction, like asking for confirmation, resolving a merge conflict or submitting more data for next sync.
 * Local tree is represented by SyncEntries — a lightweight serializable structure that can hold local data, but can omit it.
 * Whether SyncEntry has local data is determined by some heuristic on client.
 * If local data is required to sync (for example, a file was created in local workspace), a corresponding action will be included in the result.
 */
export async function syncEntry(local: SyncEntry, remote: StorageLayer) {
  const allPaths = new Set<string>(); // this is combination of all local and remote paths
  const localEntries = new Map<string, SyncEntry>(); // to speed-up lookup of local entries by path

  // we collect all local paths
  for (const localEntry of walkSyncEntries(local)) {
    allPaths.add(localEntry.path.normalized);
    localEntries.set(localEntry.path.normalized, localEntry);
  }

  // and add missing remote paths under path matching received local entry.
  // remote entry at requested path can be completely missing
  for await (const entry of walkEntry(remote.get(local.path))) {
    if (allPaths.has(entry.path.normalized)) {
      continue;
    }

    allPaths.add(entry.path.normalized);
  }

  const result: SyncResult[] = [];

  for (const entryPath of allPaths.values()) {
    const local = localEntries.get(entryPath);
    const remotePointer = remote.get(new StoragePath(entryPath)); // remote entry here can be missing

    const diff = await getEntryDiff(local, remotePointer);
    console.log(`diff: ${ entryPath } -> ${ diff }`);
    if (diff) {
      result.push(await resolveDiff(diff, local, remotePointer, true));
    }
  }

  return result;
}


/**
 * Walks through all entries in the tree, including all children.
 * Children are walked in depth-first order.
 */
function* walkSyncEntries(entry: SyncEntry): Generator<SyncEntry> {
  for (const child of entry.children || []) {
    yield* walkSyncEntries(child);
  }

  yield entry;
}


async function* walkEntry(entry: StorageEntryPointer): AsyncGenerator<StorageEntryPointer> {
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
      yield* await walkEntry(child);
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
    case DiffType.InputUpdate:
      // replace output with input data
      assert(input != null);
      if (input.data) {
        return {
          path: remote.path.normalized,
          action: SyncResultAction.Updated,
          identity: await writeEntry(remote, input.data),
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
      if (!input.isDir && input.data != null) {
        return {
          path: remote.path.normalized,
          action: SyncResultAction.Created,
          identity: await writeEntry(remote, input.data),
          data: undefined
        };
      } else if (input.isDir) {
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
