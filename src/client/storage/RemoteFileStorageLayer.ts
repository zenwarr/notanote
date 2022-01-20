import { StorageEntry, StorageEntryStats, StorageLayer, StorageLayerFlag } from "../../common/storage/StorageLayer";
import { StoragePath } from "../../common/storage/StoragePath";
import { Backend } from "../backend/Backend";
import { WorkspaceBackend } from "../backend/WorkspaceBackend";


export class RemoteFileStorageLayer extends StorageLayer {
  constructor(wsId: string) {
    super();
    this.wsId = wsId;
  }


  private readonly wsId: string;


  override async createDir(path: StoragePath): Promise<StorageEntry> {
    await Backend.get(WorkspaceBackend).createEntry(this.wsId, path.path, "dir");
    return new RemoteFileStorageEntry(this.wsId, path);
  }


  override flags(): number {
    return StorageLayerFlag.Writable;
  }


  override async get(path: StoragePath): Promise<StorageEntry | undefined> {
    return new RemoteFileStorageEntry(this.wsId, path);
  }


  override async list(path: StoragePath): Promise<StorageEntry[] | undefined> {
    throw new Error("Method not implemented"); // todo
  }


  override async remove(path: StoragePath): Promise<void> {
    await Backend.get(WorkspaceBackend).removeEntry(this.wsId, path.path);
  }


  override async write(path: StoragePath, content: Buffer | string): Promise<StorageEntry> {
    if (typeof content !== "string") {
      throw new Error("Writing binary content not supported for this layer");
    }

    await Backend.get(WorkspaceBackend).saveEntry(this.wsId, path.path, content);
    return new RemoteFileStorageEntry(this.wsId, path);
  }
}


export class RemoteFileStorageEntry extends StorageEntry {
  constructor(wsId: string, path: StoragePath) {
    super();
    this.path = path;
    this.wsId = wsId;
  }


  private readonly wsId: string;
  private readonly path: StoragePath;


  override flags(): number {
    return 0;
  }


  override getPath(): StoragePath {
    return this.path;
  }


  override async readText(): Promise<string | undefined> {
    const reply = await Backend.get(WorkspaceBackend).getEntry(this.wsId, this.path.path);
    return reply.content;
  }


  override async stats(): Promise<StorageEntryStats | undefined> {
    throw new Error("Method not implemented"); // todo
  }


  override async write(content: Buffer | string): Promise<void> {
    throw new Error("Method not implemented"); // todo
  }
}
