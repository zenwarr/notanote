import { StoragePath } from "@storage/storage-path";
import { ContentIdentity } from "@sync/ContentIdentity";
import { SyncOutlineEntry } from "@sync/SyncEntry";


export interface SyncTargetProvider {
  getId(): Promise<string>;

  getOutline(path: StoragePath): Promise<SyncOutlineEntry | undefined>;

  update(path: StoragePath, data: Buffer, remoteIdentity: ContentIdentity | undefined): Promise<void>;

  createDir(path: StoragePath, remoteIdentity: ContentIdentity | undefined): Promise<void>;

  remove(path: StoragePath, remoteIdentity: ContentIdentity): Promise<void>;

  read(path: StoragePath): Promise<Buffer>;
}
