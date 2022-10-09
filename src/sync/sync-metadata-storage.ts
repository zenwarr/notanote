import { StoragePath } from "@storage/storage-path";
import { SyncDiffType } from "@sync/sync-diff-type";
import { ContentIdentity } from "./content-identity";


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
   * Updates a single entry in the map depending on its actual value
   */
  updateSingle(path: StoragePath, updater: (d: EntrySyncMetadata | undefined) => EntrySyncMetadata | undefined): Promise<void>;

  /**
   * Sets multiple values at once.
   * If a value for a key has `undefined` or `null` value, the value is going to be deleted from the storage.
   */
  setMulti(data: SyncMetadataMap): Promise<void>;
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
