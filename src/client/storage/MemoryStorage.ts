import * as p from "path";
import * as mobx from "mobx";
import { StorageEntryPointer, StorageEntryType, StorageError, StorageErrorCode, StorageLayer } from "../../common/storage/StorageLayer";
import { StoragePath } from "../../common/storage/StoragePath";
import { SerializableStorageEntryData } from "../../common/workspace/SerializableStorageEntryData";


export class MemoryStorage extends StorageLayer {
  constructor(initial?: SerializableStorageEntryData) {
    super();
    this.initial = initial;
    this.root = new MemoryStorageEntryPointer(this, StoragePath.root, StorageEntryType.Dir, []);
    if (this.initial) {
      this.root.initialize(this.initial);
    }
  }


  private readonly initial: SerializableStorageEntryData | undefined;


  override async createDir(path: StoragePath) {
    const parent = await this.getPointer(
        this.root, path.parentDir, getPathParts(path.parentDir.normalized), true
    );

    const newEntry = new MemoryStorageEntryPointer(this, path, StorageEntryType.Dir, []);
    if (parent.directChildren?.some(child => child.path.isEqual(path))) {
      throw new Error(`Directory ${ path } already exists`);
    }

    if (!parent.directChildren) {
      parent.directChildren = [];
    }

    parent.directChildren.push(newEntry);
    return newEntry;
  }


  override get(path: StoragePath) {
    return this.getPointer(this.root, path, getPathParts(path.normalized), false);
  }


  override async loadAll() {
    return this.initial;
  }


  private getPointer(entry: MemoryStorageEntryPointer, fullPath: StoragePath, parts: string[], createDirs: boolean): MemoryStorageEntryPointer {
    const topPart = parts[0];
    if (!topPart) {
      return entry;
    }

    let child = entry.directChildren?.find(c => c.path.basename === topPart);
    if (!child) {
      if (createDirs) {
        child = new MemoryStorageEntryPointer(this, entry.path.child(topPart), StorageEntryType.Dir, []);
        entry.directChildren = [ ...entry.directChildren || [], child ];
      } else {
        return new MemoryStorageEntryPointer(this, fullPath);
      }
    }

    return parts.length === 1 ? child : this.getPointer(child, fullPath, parts.slice(1), createDirs);
  }


  createEntry(entry: MemoryStorageEntryPointer) {
    const parent = entry.path.parentDir;
    const parentEntry = this.getPointer(this.root, parent, getPathParts(parent.normalized), true);

    if (parentEntry.directChildren?.some(child => child.path.isEqual(entry.path))) {
      throw new Error(`Entry ${ entry.path } already exists`);
    } else {
      parentEntry.directChildren = [ ...parentEntry.directChildren || [], entry ];
    }
  }


  removeEntry(path: StoragePath) {
    const parent = this.getPointer(this.root, path.parentDir, getPathParts(path.parentDir.normalized), false);
    if (!parent) {
      throw new Error(`Entry ${ path } does not exist`);
    }

    const entry = parent.directChildren?.find(c => c.path.isEqual(path));
    if (!entry) {
      throw new Error(`Entry ${ path } does not exist`);
    }

    parent.directChildren = parent.directChildren?.filter(c => c !== entry);
  }


  readonly root: MemoryStorageEntryPointer;
}


function getPathParts(path: string): string[] {
  return path.split(p.sep).filter(x => x !== "");
}


export class MemoryStorageEntryPointer extends StorageEntryPointer {
  constructor(layer: MemoryStorage, path: StoragePath);
  constructor(layer: MemoryStorage, path: StoragePath, type: StorageEntryType.File, content: string | undefined);
  constructor(layer: MemoryStorage, path: StoragePath, type: StorageEntryType.Dir, content: MemoryStorageEntryPointer[] | undefined);
  constructor(layer: MemoryStorage, path: StoragePath, type?: StorageEntryType, childrenOrContent?: string | MemoryStorageEntryPointer[] | undefined) {
    super(path);
    this.storage = layer;
    this.type = type;
    if (type === StorageEntryType.File) {
      this.content = childrenOrContent as string | undefined;
    } else if (type === StorageEntryType.Dir) {
      this.directChildren = childrenOrContent as MemoryStorageEntryPointer[] | undefined;
    } else {
      this._exists = false;
    }

    mobx.makeObservable(this, {
      content: mobx.observable,
      directChildren: mobx.observable,
      type: mobx.observable,
      _exists: mobx.observable
    });
  }


  private readonly storage: MemoryStorage;

  /**
   * If value is undefined, the entry is a directory or content is not yet loaded.
   */
  content: string | undefined = undefined;

  /**
   * If value is undefined, the entry is a file.
   */
  directChildren: MemoryStorageEntryPointer[] | undefined = undefined;


  _exists: boolean = true;


  /**
   * If value is undefined, type is not known yet.
   */
  type: StorageEntryType | undefined = undefined;


  initialize(remoteStorageEntryData: SerializableStorageEntryData) {
    const toMemoryStorageEntry = (d: SerializableStorageEntryData): MemoryStorageEntryPointer => {
      if (d.stats.isDirectory) {
        return new MemoryStorageEntryPointer(
            this.storage,
            new StoragePath(d.path),
            StorageEntryType.Dir,
            d.children?.map(toMemoryStorageEntry) || []
        );
      } else {
        return new MemoryStorageEntryPointer(
            this.storage,
            new StoragePath(d.path),
            StorageEntryType.File,
            d.textContent
        );
      }
    };

    this.directChildren = remoteStorageEntryData.children?.map(toMemoryStorageEntry) || [];
    this.type = StorageEntryType.Dir;
  }


  override async children() {
    if (this.type !== StorageEntryType.Dir) {
      throw new StorageError(StorageErrorCode.NotDirectory, this.path, "Not a directory");
    }

    return this.directChildren || [];
  }


  override async readText() {
    if (!this._exists) {
      throw new StorageError(StorageErrorCode.NotExists, this.path, "Not exists");
    }

    if (this.type !== StorageEntryType.File) {
      throw new StorageError(StorageErrorCode.NotFile, this.path, "Not a file");
    }

    return this.content || "";
  }


  override async remove() {
    if (!this._exists) {
      throw new StorageError(StorageErrorCode.NotExists, this.path, "Not exists");
    }

    this.storage.removeEntry(this.path);
    this.content = undefined;
    this.directChildren = undefined;
    this._exists = false;
  }


  override async stats() {
    if (!this._exists) {
      throw new StorageError(StorageErrorCode.NotExists, this.path, "Not exists");
    }

    return {
      isDirectory: this.type === StorageEntryType.Dir,
      createTs: undefined,
      updateTs: undefined,
    };
  }


  override async writeOrCreate(content: Buffer | string) {
    if (!this._exists) {
      this._exists = true;
      this.type = StorageEntryType.File;
      this.storage.createEntry(this);
    }

    if (Buffer.isBuffer(content)) {
      this.content = content.toString();
    } else {
      this.content = content;
    }
  }


  override async exists() {
    return this._exists;
  }
}
