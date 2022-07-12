import { StorageEntryPointer, FileStats, StorageLayer, StorageErrorCode, StorageError } from "../../common/storage/StorageLayer";
import { StoragePath } from "../../common/storage/StoragePath";
import ky from "ky";
import { SerializableStorageEntryData } from "../../common/workspace/SerializableStorageEntryData";
import assert from "assert";


export class RemoteHttpStorage extends StorageLayer {
  constructor(wsId: string) {
    super();
    this.wsId = wsId;
  }


  readonly wsId: string;
  readonly cache = new Map<string, SerializableStorageEntryData | undefined>();


  override async createDir(path: StoragePath): Promise<StorageEntryPointer> {
    const reply = await ky.post(`/api/storages/${ this.wsId }/files`, {
      json: {
        entryPath: path.normalized,
        type: "dir"
      }
    }).json<SerializableStorageEntryData>();

    return new StorageEntryPointer(path, this);
  }


  override get(path: StoragePath): StorageEntryPointer {
    return new StorageEntryPointer(path, this);
  }


  override async loadAll(): Promise<SerializableStorageEntryData> {
    return ky.get(`/api/storages/${ this.wsId }/tree`).json<SerializableStorageEntryData>();
  }


  override async children(path: StoragePath): Promise<StorageEntryPointer[]> {
    const reply = await ky(`/api/storages/${ this.wsId }/files/${ path.normalized }`, {
      searchParams: {
        children: true
      }
    }).json<SerializableStorageEntryData>();

    assert(reply.children != null);

    return reply.children.map(entry => new StorageEntryPointer(new StoragePath(entry.path), this));
  }


  override async readText(path: StoragePath): Promise<string> {
    const reply = await ky(`/api/storages/${ this.wsId }/files/${ path.normalized }`, {
      searchParams: {
        text: true
      }
    }).json<SerializableStorageEntryData>();
    assert(reply.textContent != null);

    return reply.textContent;
  }


  override async remove(path: StoragePath): Promise<void> {
    await ky.delete(`/api/storages/${ this.wsId }/files/${ path.normalized }`).json();
    this.cache.delete(path.normalized);
  }


  override async stats(path: StoragePath): Promise<FileStats> {
    const data = await this.getRemoteData(path);
    if (!data) {
      throw new StorageError(StorageErrorCode.NotExists, path, `File does not exist`);
    }

    return data.stats;
  }


  override async writeOrCreate(path: StoragePath, content: Buffer | string): Promise<StorageEntryPointer> {
    if (typeof content !== "string") {
      throw new StorageError(StorageErrorCode.BinaryContentNotSupported, path, "Binary content is not supported");
    }

    const remoteData = await ky.put(`/api/storages/${ this.wsId }/files/${ path.normalized }`, {
      json: {
        content
      }
    }).json<SerializableStorageEntryData>();
    this.cache.set(path.normalized, remoteData);

    return new StorageEntryPointer(path, this);
  }


  override async exists(path: StoragePath): Promise<boolean> {
    const data = await this.getRemoteData(path);
    return data != null;
  }


  private async getRemoteData(path: StoragePath): Promise<SerializableStorageEntryData | undefined> {
    if (this.cache.has(path.normalized)) {
      return this.cache.get(path.normalized);
    }

    const reply = await ky(`/api/storages/${ this.wsId }/files/${ path.normalized }`);
    if (reply.status === 404) {
      return undefined;
    } else {
      const remoteData = await reply.json<SerializableStorageEntryData>();
      this.cache.set(path.normalized, remoteData);
      return remoteData;
    }
  }
}
