import { StoragePath } from "@storage/StoragePath";
import { ContentIdentity } from "@sync/ContentIdentity";
import { RemoteSyncProvider } from "@sync/RemoteSyncProvider";
import ky from "ky";
import * as bson from "bson";
import { SyncOutlineEntry } from "@sync/SyncEntry";


const DEFAULT_STORAGE_NAME = "default";


export class HttpSyncProvider implements RemoteSyncProvider {
  constructor(server: string, storageName = DEFAULT_STORAGE_NAME) {
    this.server = server;
    this.storageName = storageName;
  }


  private readonly storageName: string;
  private readonly server: string | undefined;


  async getOutline(path: StoragePath): Promise<SyncOutlineEntry | undefined> {
    const data = await ky.get(`api/storages/${ this.storageName }/sync/outline`, {
      prefixUrl: this.server,
      credentials: "include",
      searchParams: {
        path: path.normalized
      }
    }).text();

    if (!data) {
      return undefined;
    }

    return JSON.parse(data);
  }


  async update(path: StoragePath, data: Buffer, remoteIdentity: ContentIdentity | undefined): Promise<void> {
    // todo: check errors
    await ky.post(`api/storages/${ this.storageName }/sync/update`, {
      prefixUrl: this.server,
      credentials: "include",
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
    await ky.post(`api/storages/${ this.storageName }/sync/create-dir`, {
      prefixUrl: this.server,
      credentials: "include",
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
    await ky.post(`api/storages/${ this.storageName }/sync/remove`, {
      prefixUrl: this.server,
      credentials: "include",
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
    const ab = await ky.get(`api/storages/${ this.storageName }/sync/read`, {
      prefixUrl: this.server,
      credentials: "include",
      searchParams: {
        path: path.normalized
      }
    }).arrayBuffer();
    return Buffer.from(ab);
  }
}
