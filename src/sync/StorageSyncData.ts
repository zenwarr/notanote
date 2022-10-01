import { tryParseJson } from "@common/utils/tryParse";
import { SpecialPath } from "@common/workspace/Workspace";
import { EntryStorage, StorageEntryPointer, StorageError, StorageErrorCode } from "@storage/EntryStorage";
import { StoragePath } from "@storage/StoragePath";
import { SyncDiffType } from "@sync/Sync";
import { DiffAction, EntrySyncMetadata, mergeMetadataMaps, SyncMetadataMap, SyncMetadataStorage } from "@sync/SyncMetadataStorage";
import * as uuid from "uuid";


export interface DiffHandleRule {
  files?: string | string[];
  diff?: SyncDiffType | SyncDiffType[];
  action: DiffAction;
}


export interface StorageSyncConfig {
  storageId: string;
  diffRules?: DiffHandleRule[];
}


/**
 * Abstraction for storing sync data inside storage.
 * Sync data is stored in a special directory, which is not synced (SpecialPath.SyncDir).
 * It includes sync configuration file (SpecialPath.SyncStorageConfig), sync metadata and temporary files.
 * Sync metadata is specific for each sync target storage and identified by its storage ID.
 */
export class StorageSyncData {
  constructor(storage: EntryStorage) {
    this.storage = storage;
  }


  /**
   * Should be called before working with storage sync data.
   * Generates default configuration file if it doesn't exist.
   */
  async initStorage() {
    if (!await this.storage.exists(SpecialPath.SyncStorageConfig)) {
      const defaultConfig: StorageSyncConfig = {
        storageId: uuid.v4()
      };
      await this.storage.writeOrCreate(SpecialPath.SyncStorageConfig, Buffer.from(JSON.stringify(defaultConfig)));
    }
  }


  async getConfig(): Promise<StorageSyncConfig | null> {
    const data = await this.storage.read(SpecialPath.SyncStorageConfig);
    return tryParseJson(data.toString());
  }


  async setConfig(config: StorageSyncConfig): Promise<void> {
    await this.storage.writeOrCreate(SpecialPath.SyncStorageConfig, Buffer.from(JSON.stringify(config, undefined, 2)));
  }


  getSyncMetadataStorageForRemoteStorage(remoteStorageId: string): SyncMetadataStorage {
    return new SyncMetadataStorageImpl(this.storage.get(SpecialPath.SyncDir.child(`sync-metadata-${ remoteStorageId }.json`)));
  }


  private readonly storage: EntryStorage;
}


export class SyncMetadataStorageImpl implements SyncMetadataStorage {
  constructor(p: StorageEntryPointer) {
    this.p = p;
  }


  private readonly p: StorageEntryPointer;


  async get(): Promise<SyncMetadataMap> {
    try {
      const d = await this.p.read();
      return JSON.parse(d.toString());
    } catch (e: any) {
      if (e instanceof StorageError && e.code === StorageErrorCode.NotExists) {
        return {};
      } else {
        throw e;
      }
    }
  }


  private async save(d: SyncMetadataMap): Promise<void> {
    await this.p.writeOrCreate(Buffer.from(JSON.stringify(d)));
  }


  async set(path: StoragePath, meta: EntrySyncMetadata | undefined): Promise<void> {
    const d = await this.get();
    if (!meta) {
      delete d[path.normalized];
    }

    d[path.normalized] = meta;
    await this.save(d);
  }


  async update(path: StoragePath, updater: (d: EntrySyncMetadata | undefined) => EntrySyncMetadata | undefined): Promise<void> {
    const d = await this.get();
    const updated = updater(d[path.normalized]);
    if (updated) {
      d[path.normalized] = updated;
    } else {
      delete d[path.normalized];
    }
    await this.save(d);
  }


  async setMulti(data: SyncMetadataMap): Promise<void> {
    const d = await this.get();
    mergeMetadataMaps(d, data);
    await this.save(d);
  }
}
