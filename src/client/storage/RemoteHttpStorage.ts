import { StorageEntryPointer, FileStats, StorageLayer } from "../../common/storage/StorageLayer";
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


  override async createDir(path: StoragePath): Promise<StorageEntryPointer> {
    const reply = await ky.post(`/api/storages/${ this.wsId }/files`, {
      json: {
        entryPath: path.normalized,
        type: "dir"
      }
    }).json<SerializableStorageEntryData>();

    return new RemoteStorageEntry(path, this.wsId, reply);
  }


  override get(path: StoragePath): StorageEntryPointer {
    return new RemoteStorageEntry(path, this.wsId);
  }


  override async loadAll(): Promise<SerializableStorageEntryData> {
    return ky.get(`/api/storages/${ this.wsId }/tree`).json<SerializableStorageEntryData>();
  }
}


export class RemoteStorageEntry extends StorageEntryPointer {
  constructor(path: StoragePath, wsId: string, remoteData?: SerializableStorageEntryData) {
    super(path);
    this.wsId = wsId;
    this.remoteData = remoteData;
  }


  private readonly wsId: string;
  private remoteData: SerializableStorageEntryData | undefined;
  private remoteExists: boolean | undefined;


  override async children(): Promise<StorageEntryPointer[]> {
    const reply = await ky(`/api/storages/${ this.wsId }/files/${ this.path.normalized }`, {
      searchParams: {
        children: true
      }
    }).json<SerializableStorageEntryData>();
    this.remoteExists = true;

    assert(reply.children != null);

    return reply.children.map(entry => new RemoteStorageEntry(new StoragePath(entry.path), this.wsId, entry));
  }


  override async readText(): Promise<string> {
    const reply = await ky(`/api/storages/${ this.wsId }/files/${ this.path.normalized }`, {
      searchParams: {
        text: true
      }
    }).text();
    this.remoteExists = true;
    return reply;
  }


  override async remove(): Promise<void> {
    await ky.delete(`/api/storages/${ this.wsId }/files/${ this.path.normalized }`).json();
    this.remoteExists = false;
  }


  override async stats(): Promise<FileStats> {
    if (!this.remoteData) {
      await this.loadRemoteData();
    }

    return this.remoteData!.stats;
  }


  override async writeOrCreate(content: Buffer | string): Promise<void> {
    if (typeof content !== "string") {
      throw new Error("Writing binary content not supported for this layer");
    }

    this.remoteData = await ky.put(`/api/storages/${ this.wsId }/files/${ this.path.normalized }`, {
      json: {
        content
      }
    }).json<SerializableStorageEntryData>();
    this.remoteExists = true;
  }


  override async exists(): Promise<boolean> {
    if (!this.remoteData) {
      await this.loadRemoteData();
    }

    return this.remoteExists || false;
  }


  private async loadRemoteData() {
    const reply = await ky(`/api/storages/${ this.wsId }/files/${ this.path.normalized }`);
    if (reply.status === 404) {
      this.remoteExists = false;
    } else {
      this.remoteData = await reply.json();
      this.remoteExists = true;
    }
  }
}
