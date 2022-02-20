// import { StorageEntryPointer, StorageEntryStats, StorageLayer } from "../../common/storage/StorageLayer";
// import { StoragePath } from "../../common/storage/StoragePath";
//
//
// export class BrowserFileStorageLayer extends StorageLayer {
//   constructor(root: FileSystemDirectoryHandle) {
//     super();
//     this.root = root;
//   }
//
//
//   private readonly root: FileSystemDirectoryHandle;
//
//
//   override async createDir(path: StoragePath): Promise<StorageEntryPointer> {
//     const dirs = await this.getDirectoryForPath(path, true);
//     if (!dirs) {
//       throw new Error("Failed to create directory");
//     }
//
//     return new BrowserFileStorageEntry(path, this, dirs[0], dirs[1]);
//   }
//
//
//   override get(path: StoragePath): StorageEntryPointer {
//     return new BrowserFileStorageEntry(path, this);
//   }
//
//
//   override async writeOrCreate(path: StoragePath, content: Buffer | string): Promise<StorageEntryPointer> {
//     const handles = await this.getFileHandle(path, true);
//     if (!handles) {
//       throw new Error("Failed to create file");
//     }
//
//     const entry = new BrowserFileStorageEntry(path, handles[0], handles[1]);
//     await entry.writeOrCreate(content);
//     return entry;
//   }
//
//
//   async getFileHandle(path: StoragePath, create = false): Promise<[ FileSystemDirectoryHandle, FileSystemFileHandle ] | undefined> {
//     const parents = await this.getDirectoryForPath(path.parentDir, create);
//     if (!parents) {
//       return undefined;
//     }
//
//     const parent = parents[1];
//     return [
//       parent,
//       await parent.getFileHandle(path.basename, { create })
//     ];
//   }
//
//
//   async getDirectoryForPath(path: StoragePath, createMissing = false): Promise<[ FileSystemDirectoryHandle | undefined, FileSystemDirectoryHandle ] | undefined> {
//     if (path.isEqual(StoragePath.root)) {
//       return [ undefined, this.root ];
//     } else {
//       const parents = await this.getDirectoryForPath(path.parentDir, createMissing);
//       if (parents === undefined) {
//         return undefined;
//       } else {
//         const parent = parents[1];
//         return [ parent, await parent.getDirectoryHandle(path.basename, { create: createMissing }) ];
//       }
//     }
//   }
//
//
//   static async requestFromUser(): Promise<BrowserFileStorageLayer | undefined> {
//     try {
//       return new BrowserFileStorageLayer(await showDirectoryPicker());
//     } catch (error) {
//       return undefined;
//     }
//   }
// }
//
//
// export class BrowserFileStorageEntry extends StorageEntryPointer {
//   constructor(path: StoragePath, layer: BrowserFileStorageLayer, parentHandle?: FileSystemDirectoryHandle, handle?: FileSystemHandle) {
//     super(path);
//     this.layer = layer;
//     this.parentHandle = parentHandle
//     this.handle = handle
//   }
//
//
//   private readonly layer: BrowserFileStorageLayer;
//   private parentHandle: FileSystemDirectoryHandle | undefined;
//   private handle: FileSystemHandle | undefined;
//
//
//   override async children(): Promise<StorageEntryPointer[]> {
//     const dir = this.handle instanceof FileSystemDirectoryHandle ? this.handle : undefined;
//     if (!dir) {
//       throw new Error("Not a directory");
//     }
//
//     const result: StorageEntryPointer[] = [];
//     for await (const value of dir.values()) {
//       result.push(new BrowserFileStorageEntry(this.path.child(value.name), dir, await dir.getFileHandle(value.name)));
//     }
//
//     return result;
//   }
//
//
//   override async readText(): Promise<string> {
//     const fileHandle = this.handle instanceof FileSystemFileHandle ? this.handle : undefined;
//     if (!fileHandle) {
//       throw new Error("Not a file");
//     }
//
//     return (await fileHandle.getFile()).text();
//   }
//
//
//   override async remove(): Promise<void> {
//     if (this.parentHandle) {
//       await this.parentHandle.removeEntry(this.path.basename, { recursive: true });
//     }
//   }
//
//
//   override async stats(): Promise<StorageEntryStats> {
//     return {
//       isDirectory: this.handle.kind === "directory",
//       createTs: undefined,
//       updateTs: undefined
//     };
//   }
//
//
//   override async writeOrCreate(content: Buffer | string): Promise<void> {
//     if (this.handle.kind !== "file") {
//       throw new Error("Cannot write: entry is not a file");
//     }
//
//     const writable = await this.handle.createWritable({ keepExistingData: false });
//     await writable.truncate(0);
//     await writable.write(content);
//     await writable.close();
//   }
//
//
//   override async exists(): Promise<boolean> {
//     throw new Error("Method not implemented"); // todo
//   }
// }
