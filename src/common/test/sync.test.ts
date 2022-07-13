import { KVStorageLayer } from "../storage/KVStorageLayer";
import { MapKV } from "./map-kv";
import { StoragePath } from "../storage/StoragePath";
import { DiffType, SyncEntry, syncEntry, SyncResultAction } from "../sync/StorageSync";
import { DirContentIdentity, getContentHash } from "../sync/ContentIdentity";


let remoteStorage = new KVStorageLayer(new MapKV());


function makeSyncEntryDir(path: string): SyncEntry {
  return {
    path: new StoragePath(path),
    isDir: true,
    identity: { hash: undefined, size: "unk" }
  };
}


function makeSyncEntryFile(path: string, data: string | undefined, syncedData: string | undefined = undefined): SyncEntry {
  return {
    path: new StoragePath(path),
    isDir: false,
    synced: syncedData ? {
      hash: getContentHash(syncedData),
      size: "unk"
    } : undefined,
    identity: data ? {
      hash: getContentHash(data),
      size: "unk"
    } : undefined,
    data,
  };
}


beforeEach(() => {
  remoteStorage = new KVStorageLayer(new MapKV());
});


it("should create a directory on remote", async () => {
  // should be left intact by the sync
  await remoteStorage.get(new StoragePath("file.txt")).writeOrCreate("Hello, world!");

  // should be created on remote
  const r = await syncEntry(makeSyncEntryDir("new-dir"), remoteStorage);

  expect(r).toEqual([
    {
      path: "/new-dir",
      action: SyncResultAction.Created,
      identity: DirContentIdentity
    }
  ]);
});


it("local file not changed since last sync", async () => {
  await remoteStorage.get(new StoragePath("file.txt")).writeOrCreate("Hello, world!");
  const r = await syncEntry(makeSyncEntryFile("file.txt", "Hello, world!", "Hello, world!"), remoteStorage);

  expect(r).toHaveLength(0);
});


it("local file has no sync information", async () => {
  await remoteStorage.get(new StoragePath("file.txt")).writeOrCreate("Hello, world!");
  const r = await syncEntry(makeSyncEntryFile("file.txt", "Hello, world!"), remoteStorage);

  expect(r).toHaveLength(0);
});


it("local file is removed", async () => {
  await remoteStorage.get(new StoragePath("file.txt")).writeOrCreate("Hello, world!");
  const r = await syncEntry(makeSyncEntryFile("file.txt", undefined, "Hello, world!"), remoteStorage);

  expect(r).toMatchObject([
    {
      path: "/file.txt",
      action: SyncResultAction.Removed,
    }
  ]);
});


it("local file is missing, no sync info and remote file does exist", async () => {
  await remoteStorage.get(new StoragePath("file.txt")).writeOrCreate("Hello, world!");
  const r = await syncEntry(makeSyncEntryFile("file.txt", undefined, undefined), remoteStorage);

  expect(r).toMatchObject([
    {
      path: "/file.txt",
      action: SyncResultAction.LocalCreateRequired,
      data: "Hello, world!"
    }
  ]);
});


it("remote file was updated", async () => {
  await remoteStorage.get(new StoragePath("file.txt")).writeOrCreate("Hello, world! Updated");
  const r = await syncEntry(makeSyncEntryFile("file.txt", "Hello, world!", "Hello, world!"), remoteStorage);

  expect(r).toMatchObject([
    {
      path: "/file.txt",
      action: SyncResultAction.LocalUpdateRequired,
      data: "Hello, world! Updated"
    }
  ]);
});


it("remote file was removed", async () => {
  const r = await syncEntry(makeSyncEntryFile("file.txt", "Hello, world!", "Hello, world!"), remoteStorage);

  expect(r).toMatchObject([
    {
      path: "/file.txt",
      action: SyncResultAction.LocalRemoveRequired
    }
  ]);
});


it("remote file was removed and local file was removed too", async () => {
  const r = await syncEntry(makeSyncEntryFile("file.txt", undefined, "Hello, world!"), remoteStorage);

  expect(r).toHaveLength(0);
});


it("remote file was removed and local file was updated since last sync", async () => {
  const r = await syncEntry(makeSyncEntryFile("file.txt", "Hello, world! Updated", "Hello, world!"), remoteStorage);

  expect(r).toMatchObject([
    {
      path: "/file.txt",
      conflict: DiffType.ConflictingRemoteRemove
    }
  ]);
});


it("local file is updated", async () => {
  await remoteStorage.get(new StoragePath("file.txt")).writeOrCreate("Hello, world!");
  const r = await syncEntry(makeSyncEntryFile("file.txt", "Hello, world! Updated", "Hello, world!"), remoteStorage);

  expect(r).toMatchObject([
    {
      path: "/file.txt",
      action: SyncResultAction.Updated
    }
  ]);
});


it("local file was updated and remote file was updated too, but with different content", async () => {
  await remoteStorage.get(new StoragePath("file.txt")).writeOrCreate("Hello, world! Server update");
  const r = await syncEntry(makeSyncEntryFile("file.txt", "Hello, world! Updated", "Hello, world!"), remoteStorage);

  expect(r).toMatchObject([
    {
      path: "/file.txt",
      conflict: DiffType.ConflictingUpdate,
      data: "Hello, world! Server update"
    }
  ]);
});


it("local file was removed, but server file was updated", async () => {
  await remoteStorage.get(new StoragePath("file.txt")).writeOrCreate("Hello, world!");
  const r = await syncEntry(makeSyncEntryFile("file.txt",  undefined, "Hello, world! Updated"), remoteStorage);

  expect(r).toMatchObject([
    {
      path: "/file.txt",
      conflict: DiffType.ConflictingLocalRemove
    }
  ]);
});
