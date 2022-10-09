import { StoragePath } from "@storage/storage-path";
import { ContentIdentity } from "@sync/content-identity";
import { SyncOutlineEntry } from "@sync/sync-entry";


export interface SyncTargetProvider {
  getId(): Promise<string>;

  getOutline(path: StoragePath): Promise<SyncOutlineEntry | undefined>;

  update(path: StoragePath, data: Buffer, remoteIdentity: ContentIdentity | undefined): Promise<void>;

  createDir(path: StoragePath, remoteIdentity: ContentIdentity | undefined): Promise<void>;

  remove(path: StoragePath, remoteIdentity: ContentIdentity): Promise<void>;

  read(path: StoragePath): Promise<Buffer>;
}
