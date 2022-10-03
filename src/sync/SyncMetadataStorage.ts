import { StoragePath } from "@storage/storage-path";
import { SyncDiffType } from "@sync/Sync";
import { ContentIdentity } from "./ContentIdentity";


export interface EntrySyncMetadata {
  /**
   * Identifies last successfully synced content.
   * If `undefined`, the entry was not synced yet or missing from remote.
  */
  synced: ContentIdentity | undefined;

  /**
   * Identifies locally accepted content.
   * If `undefined`, the entry was not accepted yet.
   * If `false`, the entry was deleted locally and this deletion was accepted.
   */
  accepted: ContentIdentity | undefined | false;

  action: DiffAction | undefined;

  diff: SyncDiffType | undefined;
}


export enum DiffAction {
  AcceptAuto = "accept_auto",
  AcceptLocal = "accept_local",
  AcceptRemote = "accept_remote",
}


export interface SyncMetadataStorage {
  /**
   * Returns entire metadata map
   */
  get(): Promise<SyncMetadataMap>;

  /**
   * Sets a single value in the map
   */
  set(path: StoragePath, data: EntrySyncMetadata | undefined): Promise<void>;

  /**
   * Updates a single entry in the map depending on its actual value
   */
  update(path: StoragePath, updater: (d: EntrySyncMetadata | undefined) => EntrySyncMetadata | undefined): Promise<void>;

  /**
   * Sets multiple values at once.
   * If a value for a key has `undefined` or `null` value, the value is going to be deleted from the storage.
   */
  setMulti(data: SyncMetadataMap): Promise<void>;
}


export function *walkSyncMetadataTopDown(metadata: SyncMetadataMap): Generator<[ StoragePath, EntrySyncMetadata ]> {
  const paths = new Map<string, StoragePath>();

  for (const key of Object.keys(metadata)) {
    const path = new StoragePath(key)
    paths.set(key, path);
  }

  const visited = new Set<string>();

  function *enumerateChildren(parentPath: StoragePath) {
    for (const [ key, path ] of paths) {
      if (path.inside(parentPath, false)) {
        yield key;
      }
    }
  }

  function *walkChildren(parentPath: StoragePath): Generator<[ StoragePath, EntrySyncMetadata ]> {
    const later = new Set<string>();

    for (const key of enumerateChildren(parentPath)) {
      if (visited.has(key)) {
        continue;
      }

      visited.add(key);

      const childPath = paths.get(key)!;
      if (childPath.isDirectChildOf(parentPath)) {
        yield [ childPath, metadata[key]! ];
      } else {
        later.add(key);
      }
    }

    for (const key of later.values()) {
      yield [ paths.get(key)!, metadata[key]! ];
      yield *walkChildren(paths.get(key)!);
    }
  }

  yield *walkChildren(StoragePath.root);
}


export type SyncMetadataMap = { [path: string]: EntrySyncMetadata | undefined };


export function mergeMetadataMaps(target: SyncMetadataMap, updated: SyncMetadataMap) {
  for (const [ key, value ] of Object.entries(updated)) {
    if (value != null) {
      target[key] = value;
    } else {
      delete target[key];
    }
  }
}
