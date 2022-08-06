import { StoragePath } from "@storage/StoragePath";
import { ContentIdentity } from "@sync/ContentIdentity";
import { SyncDiffType } from "@sync/LocalSyncWorker";
import { EntrySyncMetadata } from "@sync/SyncMetadataStorage";


export interface SyncDiffEntry {
  path: StoragePath;
  diff: SyncDiffType;
  actual: ContentIdentity | undefined;
  remote: ContentIdentity | undefined;
  syncMetadata: EntrySyncMetadata | undefined;
}
