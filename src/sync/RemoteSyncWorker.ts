import { StorageEntryStats, StorageError, StorageErrorCode, StorageLayer } from "@storage/StorageLayer";
import { StoragePath } from "@storage/StoragePath";
import { ContentIdentity, DirContentIdentity, getContentIdentity } from "@sync/ContentIdentity";
import { RemoteSyncProvider } from "@sync/RemoteSyncProvider";
import { SyncOutlineEntry } from "@sync/SyncEntry";


export class RemoteSyncWorker implements RemoteSyncProvider {
  constructor(storage: StorageLayer) {
    this.remote = storage;
  }


  private remote!: StorageLayer;


  async getOutline(start: StoragePath): Promise<SyncOutlineEntry | undefined> {
    const storage = this.remote;

    let stats: StorageEntryStats | undefined = undefined;
    try {
      stats = await storage.stats(start);
    } catch (err: any) {
      if (err instanceof StorageError && err.code === StorageErrorCode.NotExists) {
        return undefined;
      } else {
        throw err;
      }
    }

    const identity = stats.isDirectory ? DirContentIdentity : await getContentIdentity(storage.get(start));
    if (!identity) {
      return undefined;
    }

    const result: SyncOutlineEntry = {
      name: start.basename,
      identity,
      stats
    };

    if (stats.isDirectory) {
      const children = await storage.children(start);
      const childOutlines = (await Promise.all(children.map(child => this.getOutline(child.path))));

      result.children = childOutlines.filter(x => x != null) as SyncOutlineEntry[];
    }

    return result;
  }


  async update(path: StoragePath, data: Buffer, remoteIdentity: ContentIdentity | undefined): Promise<void> {
    // todo: check identity
    await this.remote.writeOrCreate(path, data);
  }


  async createDir(path: StoragePath, remoteIdentity: ContentIdentity | undefined): Promise<void> {
    // todo: check identity
    await this.remote.createDir(path);
  }


  async remove(path: StoragePath, remoteIdentity: ContentIdentity): Promise<void> {
    // todo: check identity
    await this.remote.remove(path);
  }


  async read(path: StoragePath): Promise<Buffer> {
    return this.remote.read(path);
  }
}
