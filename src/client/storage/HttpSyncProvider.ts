import { StoragePath } from "@storage/StoragePath";
import { ContentIdentity } from "@sync/ContentIdentity";
import { RemoteSyncProvider } from "@sync/RemoteSyncProvider";
import ky from "ky";
import * as bson from "bson";
import { SyncOutlineEntry } from "@sync/SyncEntry";


export class HttpSyncProvider implements RemoteSyncProvider {
  constructor(storageId: string) {
    this.storageId = storageId;
  }


  private readonly storageId: string;


  async getOutline(path: StoragePath): Promise<SyncOutlineEntry | undefined> {
    return await ky.get(`/api/storages/${ this.storageId }/sync/outline`, {
      searchParams: {
        path: path.normalized
      }
    }).json();
  }


  async update(path: StoragePath, data: Buffer, remoteIdentity: ContentIdentity | undefined): Promise<void> {
    // todo: check errors
    await ky.post(`/api/storages/${ this.storageId }/sync/update`, {
      headers: {
        "content-type": "application/bson"
      },
      body: bson.serialize({
        path: path.normalized,
        data,
        remoteIdentity
      })
    });
  }


  async createDir(path: StoragePath, remoteIdentity: ContentIdentity | undefined): Promise<void> {
    // todo: check errors
    await ky.post(`/api/storages/${ this.storageId }/sync/create-dir`, {
      headers: {
        "content-type": "application/bson"
      },
      body: bson.serialize({
        path: path.normalized,
        remoteIdentity
      })
    });
  }


  async remove(path: StoragePath, remoteIdentity: ContentIdentity): Promise<void> {
    // todo: check errors
    await ky.post(`/api/storages/${ this.storageId }/sync/remove`, {
      headers: {
        "content-type": "application/bson"
      },
      body: bson.serialize({
        path: path.normalized,
        remoteIdentity
      })
    });
  }


  async read(path: StoragePath): Promise<Buffer> {
    // todo: check errors
    const ab = await ky.get(`/api/storages/${ this.storageId }/sync/read`, {
      searchParams: {
        path: path.normalized
      }
    }).arrayBuffer();
    return Buffer.from(ab);
  }
}
