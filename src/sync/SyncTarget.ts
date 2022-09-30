import { StorageEntryStats, StorageError, StorageErrorCode, EntryStorage } from "@storage/EntryStorage";
import { StoragePath } from "@storage/StoragePath";
import { ContentIdentity, DirContentIdentity, getContentIdentity } from "@sync/ContentIdentity";
import { shouldPathBeSynced } from "@sync/Ignore";
import { SyncTargetProvider } from "@sync/SyncTargetProvider";
import { StorageSyncData } from "@sync/StorageSyncData";
import { SyncOutlineEntry } from "@sync/SyncEntry";


export class SyncTarget implements SyncTargetProvider {
  constructor(storage: EntryStorage) {
    this.storage = storage;
  }


  private storage!: EntryStorage;


  async getId(): Promise<string> {
    const sd = new StorageSyncData(this.storage);
    await sd.initStorage();
    const id = (await sd.getConfig())?.storageId;

    if (!id) {
      throw new Error("Storage id not defined");
    }

    return id;
  }


  async getOutline(start: StoragePath): Promise<SyncOutlineEntry | undefined> {
    if (!shouldPathBeSynced(start)) {
      return undefined;
    }

    const storage = this.storage;

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
    await this.storage.writeOrCreate(path, data);
  }


  async createDir(path: StoragePath, remoteIdentity: ContentIdentity | undefined): Promise<void> {
    // todo: check identity
    await this.storage.createDir(path);
  }


  async remove(path: StoragePath, remoteIdentity: ContentIdentity): Promise<void> {
    // todo: check identity
    await this.storage.remove(path);
  }


  async read(path: StoragePath): Promise<Buffer> {
    return this.storage.read(path);
  }
}
