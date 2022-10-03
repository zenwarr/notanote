/// <reference types="cordova-plugin-file" />
import { EntryStorage, StorageEntryPointer, StorageEntryStats, StorageError, StorageErrorCode } from "@storage/entry-storage";
import { StoragePath } from "@storage/storage-path";


declare global {
  const cordova: Cordova;
}


// todo: check error codes
export class AndroidFileStorage extends EntryStorage {
  constructor() {
    super();
  }


  static async getStorageDir(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, (fs: FileSystem) => {
        resolve(fs.root.fullPath)
      }, reject);
    });
  }


  async children(path: StoragePath): Promise<StorageEntryPointer[]> {
    const entry = await this.getEntry(path);
    if (!entry) {
      throw new StorageError(StorageErrorCode.NotExists, path, "Directory not found");
    } else if (!entry.isDirectory) {
      throw new StorageError(StorageErrorCode.NotDirectory, path, "Not a directory");
    }

    const dirReader = (entry as DirectoryEntry).createReader();

    return new Promise((resolve, reject) => {
      dirReader.readEntries(entries => {
        resolve(entries.map(entry => new StorageEntryPointer(path.child(entry.name), this)));
      }, reject);
    });
  }


  async createDir(path: StoragePath): Promise<void> {
    await this.getDirectory(path, true);
  }


  async exists(path: StoragePath): Promise<boolean> {
    const entry = await this.getEntry(path);
    return entry != null;
  }


  async read(path: StoragePath): Promise<Buffer> {
    const entry = await this.getEntry(path);
    if (!entry) {
      throw new StorageError(StorageErrorCode.NotExists, path, "File not found");
    } else if (!entry.isFile) {
      throw new StorageError(StorageErrorCode.NotFile, path, "Not a file");
    }

    const fileEntry = entry as FileEntry;

    return new Promise((resolve, reject) => {
      fileEntry.file(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(Buffer.from(reader.result as ArrayBuffer));
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      });
    });
  }


  async remove(path: StoragePath): Promise<void> {
    const entry = await this.getEntry(path);
    if (!entry) {
      throw new StorageError(StorageErrorCode.NotExists, path, "File not found");
    }

    return new Promise((resolve, reject) => {
      if (entry.isFile) {
        (entry as FileEntry).remove(resolve, reject);
      } else {
        (entry as DirectoryEntry).removeRecursively(resolve, reject);
      }
    });
  }


  async stats(path: StoragePath): Promise<StorageEntryStats> {
    const entry = await this.getEntry(path);
    if (!entry) {
      throw new StorageError(StorageErrorCode.NotExists, path, "File not found");
    }

    return new Promise((resolve, reject) => {
      entry.getMetadata(metadata => {
        resolve({
          isDirectory: entry.isDirectory,
          size: metadata.size,
          createTs: undefined,
          updateTs: metadata.modificationTime.valueOf()
        });
      }, reject);
    })
  }


  async writeOrCreate(path: StoragePath, content: Buffer): Promise<void> {
    const entry = await this.getEntry(path, true);
    if (entry && entry.isDirectory) {
      throw new StorageError(StorageErrorCode.DirectoryWrite, path, "Cannot write to a directory");
    }

    return new Promise((resolve, reject) => {
      (entry as FileEntry).createWriter(fileWriter => {
        fileWriter.onwriteend = () => resolve();
        fileWriter.onerror = reject;
        fileWriter.write(new Blob([ content ]));
      });
    })
  }


  private async getEntry(path: StoragePath, create = false): Promise<FileEntry | DirectoryEntry | undefined> {
    if (path.isEqual(StoragePath.root)) {
      return this.getRoot();
    }

    const parentEntries = await this.getDirectory(path.parentDir, create);
    const parent = parentEntries?.child;
    if (!parent) {
      return undefined;
    }

    return new Promise(resolve => {
      parent.getFile(path.basename, { create }, resolve, () => {
        parent.getDirectory(path.basename, { create }, resolve, () => resolve(undefined));
      });
    });
  }


  private async getDirectory(path: StoragePath, create = false): Promise<{
    parent: DirectoryEntry | undefined,
    child: DirectoryEntry
  } | undefined> {
    const root = await this.getRoot();

    if (path.isEqual(StoragePath.root)) {
      return {
        parent: undefined,
        child: root
      };
    }

    const entries = await this.getDirectory(path.parentDir, create);
    if (!entries) {
      return undefined;
    }

    async function getDir(p: DirectoryEntry, name: string): Promise<DirectoryEntry> {
      return new Promise((resolve, reject) => {
        return p.getDirectory(name, { create }, resolve, reject);
      });
    }

    try {
      const childEntry = await getDir(entries.child, path.basename);
      return {
        parent: entries.child,
        child: childEntry
      };
    } catch (error) {
      return undefined;
    }
  }


  private async getRoot(): Promise<DirectoryEntry> {
    if (this.root) {
      return this.root;
    }

    this.root = await new Promise<DirectoryEntry>((resolve, reject) => {
      window.resolveLocalFileSystemURI(cordova.file.externalDataDirectory, d => {
        resolve(d as any as DirectoryEntry);
      }, reject);
    });
    return this.root;
  }


  private root: DirectoryEntry | undefined;
}
