import { StoragePath } from "@storage/StoragePath";
import { SyncDiffType } from "@sync/LocalSyncWorker";
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
  Accept = "accept"
}


// todo: we should remove metadata for keys missing both in the local and remote storage
// because sync does not know about them
// but if another file with the same name is going to be added to local storage later, we will get incorrect sync metadata for it
export interface SyncMetadataStorage {
  get(): Promise<SyncMetadataMap>;

  set(path: StoragePath, data: EntrySyncMetadata | undefined): Promise<void>;

  update(path: StoragePath, updater: (d: EntrySyncMetadata | undefined) => EntrySyncMetadata | undefined): Promise<void>;

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
