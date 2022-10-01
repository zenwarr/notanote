import * as _ from "lodash";
import * as mobx from "mobx";
import * as p from "path";
import { StorageEntryPointer, StorageError, StorageErrorCode, EntryStorage } from "@storage/EntryStorage";
import { StoragePath } from "@storage/StoragePath";
import { StorageEntryData } from "@common/workspace/StorageEntryData";


/**
 * Memory storage is used to keep all storage data inside memory.
 * This storage is mostly used for storing cached data of another storage and testing.
 */
export class MemoryStorage extends EntryStorage {
  /**
   * Data for the entire memory storage can be restored from a serializable object `initial`.
   */
  constructor(initial?: StorageEntryData) {
    super();

    this.setData(initial);

    mobx.makeObservable(this, {
      data: mobx.observable
    });
  }


  setData(data: StorageEntryData | undefined) {
    this.data = _.cloneDeep(data) || {
      path: StoragePath.root,
      stats: {
        isDirectory: true,
        size: undefined,
        createTs: undefined,
        updateTs: undefined
      }
    };
  }


  override async loadOutline() {
    return mobx.toJS(this.data);
  }


  private getDataAtPathInternal(startFrom: StorageEntryData, pathPartsLeft: string[], createDirs: boolean): StorageEntryData | undefined {
    const topPart = pathPartsLeft[0];
    if (!topPart) {
      return startFrom;
    }

    let child = startFrom.children?.find(c => c.path.basename === topPart);
    if (!child) {
      if (createDirs) {
        child = {
          path: startFrom.path.child(topPart),
          stats: {
            isDirectory: true,
            size: undefined,
            createTs: new Date().valueOf(),
            updateTs: new Date().valueOf()
          }
        };
        startFrom.children = [ ...startFrom.children || [], child ];
      } else {
        return undefined;
      }
    }

    return pathPartsLeft.length === 1 ? child : this.getDataAtPathInternal(child, pathPartsLeft.slice(1), createDirs);
  }


  private getDataObject(path: StoragePath, createDirs = false) {
    return this.getDataAtPathInternal(this.data, getPathParts(path.normalized), createDirs);
  }


  getDataAtPath(path: StoragePath) {
    return this.getDataObject(path);
  }


  private createDataObject(newEntryData: StorageEntryData) {
    const newPath = newEntryData.path;
    const parentPath = newPath.parentDir;

    const parentEntry = this.getDataAtPathInternal(this.data, getPathParts(parentPath.normalized), true);
    if (!parentEntry) {
      throw new StorageError(StorageErrorCode.InvalidStructure, newPath, `Failed to create entry: invalid structure`);
    }

    if (!parentEntry.stats.isDirectory) {
      throw new StorageError(StorageErrorCode.InvalidStructure, newPath, `Failed to create entry: invalid structure`);
    }

    if (parentEntry.children?.some(child => child.path.isEqual(newPath))) {
      throw new StorageError(StorageErrorCode.AlreadyExists, newEntryData.path, `Entry already exists`);
    } else {
      parentEntry.children = [ ...parentEntry.children || [], newEntryData ];
    }

    return newEntryData;
  }


  override async children(path: StoragePath): Promise<StorageEntryPointer[]> {
    const p = this.getDataObject(path);
    if (!p) {
      return [];
    }

    if (!p.stats.isDirectory) {
      throw new StorageError(StorageErrorCode.NotDirectory, path, "Not a directory");
    }

    return (p.children || []).map(c => new StorageEntryPointer(c.path, this));
  }


  override async read(path: StoragePath): Promise<Buffer> {
    const p = this.getDataObject(path);
    if (!p) {
      return Buffer.alloc(0);
    }

    if (p.stats.isDirectory) {
      throw new StorageError(StorageErrorCode.NotFile, path, "Not a file");
    }

    return p.content || Buffer.alloc(0);
  }


  override async remove(path: StoragePath) {
    const p = this.get(path);
    if (!p) {
      return;
    }

    const parent = this.getDataObject(path.parentDir);
    if (!parent) {
      return;
    }

    parent.children = parent.children?.filter(c => !c.path.isEqual(path));
  }


  override async stats(path: StoragePath) {
    const p = this.getDataObject(path);
    if (!p) {
      throw new StorageError(StorageErrorCode.NotExists, path, "Not exists");
    }

    return p.stats;
  }


  override async writeOrCreate(path: StoragePath, content: Buffer): Promise<void> {
    let p = this.getDataObject(path);
    if (!p) {
      p = this.createDataObject({
        path,
        stats: {
          isDirectory: false,
          size: content.length,
          createTs: new Date().valueOf(),
          updateTs: new Date().valueOf()
        }
      });
    }

    p.content = content;
  }


  override async exists(path: StoragePath): Promise<boolean> {
    return this.getDataObject(path) != null;
  }


  override async createDir(path: StoragePath): Promise<void> {
    this.createDataObject({
      path,
      stats: {
        isDirectory: true,
        size: undefined,
        createTs: new Date().valueOf(),
        updateTs: new Date().valueOf()
      }
    });
  }


  data!: StorageEntryData;
}


function getPathParts(path: string): string[] {
  return path.split(p.sep).filter(x => x !== "");
}
