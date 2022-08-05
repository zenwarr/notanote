import { StoragePath } from "@storage/StoragePath";
import { ContentIdentity } from "./ContentIdentity";


/**
 * Piece of information about a storage entry that allows to calculate a differences that need to be synced.
 */
export interface SyncEntry {
  path: StoragePath;

  /**
   * Identity at the time it was last synced.
   * `undefined` means that client has no sync info.
   */
  synced?: ContentIdentity;

  /**
   * Identity now.
   * `undefined` means the file does not exist now.
   */
  identity?: ContentIdentity;

  children?: SyncEntry[];

  /**
   * Data can be omitted.
   * A client can provide data for a file immediately for a faster sync if he is sure that file content is going to be needed.
   * But if content is omitted and it is required to sync, the server will request this content in its response.
   */
  data?: Buffer;
}


export type SerializedSyncEntry = Omit<SyncEntry, "path" | "children"> & {
  path: string
  children?: SerializedSyncEntry[]
}


export function serializeSyncEntry(e: SyncEntry): SerializedSyncEntry {
  return {
    ...e,
    path: e.path.normalized,
    children: e.children ? e.children.map(serializeSyncEntry) : undefined,
  };
}


export function deserializeSyncEntry(e: SerializedSyncEntry): SyncEntry {
  return {
    ...e,
    path: new StoragePath(e.path),
    children: e.children ? e.children.map(deserializeSyncEntry) : undefined,
  };
}


/**
 * Walks through all entries in the tree, including all children.
 * Children are walked in depth-first order.
 */
export function* walkSyncEntriesDownToTop(entry: SyncEntry): Generator<SyncEntry> {
  for (const child of entry.children || []) {
    yield* walkSyncEntriesDownToTop(child);
  }

  yield entry;
}
