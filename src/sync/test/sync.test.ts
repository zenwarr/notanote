import { KVEntryStorage } from "@storage/kv-entry-storage";
import { MapKV } from "@storage/map-kv";
import { EntryStorage } from "@storage/entry-storage";
import { StoragePath } from "@storage/storage-path";
import { StorageSyncData, StorageSyncConfig } from "@sync/StorageSyncData";
import { Sync } from "@sync/Sync";
import { SyncDiffType } from "@sync/SyncDiffType";
import { SyncTarget } from "@sync/SyncTarget";
import { DiffAction } from "@sync/SyncMetadataStorage";
import { SyncJobRunner } from "@sync/SyncJobRunner";


async function prepare(config?: StorageSyncConfig) {
  const local = new KVEntryStorage(new MapKV());

  const sd = new StorageSyncData(local);
  await sd.initStorage();
  if (config) {
    await sd.setConfig(config);
  }

  const remote = new KVEntryStorage(new MapKV());
  const target = new SyncTarget(remote);

  const source = new Sync(local, target);

  const runner = new SyncJobRunner(source);

  return { local, remote, sync: source, runner };
}


async function write(storage: EntryStorage, path: string, data: string) {
  await storage.writeOrCreate(new StoragePath(path), Buffer.from(data));
}


it("diff between equal files", async () => {
  const d = await prepare();
  await write(d.local, "/file.txt", "hello world");
  await write(d.remote, "/file.txt", "hello world");

  await d.sync.updateDiff();
  await d.sync.acceptMulti(d.sync.actualDiff);
  expect(d.sync.actualDiff).toHaveLength(0);

  await d.sync.updateDiff();
  expect(d.sync.actualDiff).toHaveLength(0);
});


it("local file changed", async () => {
  const d = await prepare();
  await write(d.local, "/file.txt", "hello, world!");

  await d.sync.updateDiff();
  await d.sync.acceptMulti(d.sync.actualDiff);

  await write(d.local, "/file.txt", "hello, world! updated");
  await write(d.remote, "/file.txt", "hello world");

  await d.sync.updateDiff();
  expect(d.sync.actualDiff).toHaveLength(1);
  expect(d.sync.actualDiff[0]!.diff).toEqual(SyncDiffType.ConflictingCreate);
});


it("initializing from remote storage", async () => {
  const d = await prepare();
  await write(d.remote, "/file.txt", "hello world");
  await d.sync.updateDiff();

  expect(d.sync.actualDiff).toHaveLength(1);
  expect(d.sync.actualDiff[0]!.diff).toEqual(SyncDiffType.RemoteCreate);

  await d.sync.acceptMulti(d.sync.actualDiff);
  await d.runner.run(true);

  await d.sync.updateDiff();
  expect(d.sync.actualDiff.length).toEqual(0);

  const localRead = await d.local.read(new StoragePath("/file.txt"));
  expect(localRead.toString()).toEqual("hello world");
});


it("resolving conflict by accepting local changes", async () => {
  const d = await prepare();
  await write(d.local, "file.txt", "local");
  await write(d.remote, "file.txt", "remote");
  await d.sync.updateDiff();

  expect(d.sync.actualDiff).toHaveLength(1);
  expect(d.sync.actualDiff[0]!.diff).toEqual(SyncDiffType.ConflictingCreate);

  await d.sync.accept(d.sync.actualDiff[0]!, DiffAction.AcceptLocal);
  await d.runner.run(true);

  await d.sync.updateDiff();
  expect(d.sync.actualDiff.length).toEqual(0);

  const localRead = await d.local.read(new StoragePath("/file.txt"));
  expect(localRead.toString()).toEqual("local");

  const remoteRead = await d.remote.read(new StoragePath("/file.txt"));
  expect(remoteRead.toString()).toEqual("local");
});


it("resolving conflict by accepting remote changes", async () => {
  const d = await prepare();
  await write(d.local, "file.txt", "local");
  await write(d.remote, "file.txt", "remote");
  await d.sync.updateDiff();

  expect(d.sync.actualDiff).toHaveLength(1);
  expect(d.sync.actualDiff[0]!.diff).toEqual(SyncDiffType.ConflictingCreate);

  await d.sync.accept(d.sync.actualDiff[0]!, DiffAction.AcceptRemote);
  await d.runner.run(true);

  await d.sync.updateDiff();
  expect(d.sync.actualDiff.length).toEqual(0);

  const localRead = await d.local.read(new StoragePath("/file.txt"));
  expect(localRead.toString()).toEqual("remote");

  const remoteRead = await d.remote.read(new StoragePath("/file.txt"));
  expect(remoteRead.toString()).toEqual("remote");
});


it("modification after accepting", async () => {
  const d = await prepare();

  await write(d.remote, "file.txt", "remote");
  await d.sync.updateDiff();
  await d.sync.acceptMulti(d.sync.actualDiff);

  await d.remote.remove(new StoragePath("/file.txt"));

  await d.runner.run(true);

  expect(await d.local.exists(new StoragePath("file.txt"))).toEqual(false);
  expect(await d.remote.exists(new StoragePath("file.txt"))).toEqual(false);

  expect(d.sync.actualDiff).toHaveLength(0);
  expect(d.runner.errors).toHaveLength(0);

  await d.sync.updateDiff();

  expect(d.sync.actualDiff).toHaveLength(0);
});


it("local modification after accepting", async () => {
  const d = await prepare();

  await write(d.local, "file.txt", "local");
  await d.sync.updateDiff();
  await d.sync.acceptMulti(d.sync.actualDiff);

  await d.local.remove(new StoragePath("file.txt"));

  await d.runner.run(true);

  expect(await d.local.exists(new StoragePath("file.txt"))).toEqual(false);
  expect(await d.remote.exists(new StoragePath("file.txt"))).toEqual(false);

  expect(d.sync.actualDiff).toHaveLength(0);
  expect(d.runner.errors).toHaveLength(0);

  await d.sync.updateDiff();

  expect(d.sync.actualDiff).toHaveLength(0);
});


it("automatically accept change", async () => {
  const d = await prepare({
    storageId: "test",
    diffRules: [
      {
        diff: SyncDiffType.LocalCreate,
        action: DiffAction.AcceptAuto,
      }
    ]
  });
  await write(d.local, "/file.txt", "hello, world!");

  await d.sync.updateDiff();
  await d.runner.run(true);

  await d.sync.updateDiff();
  expect(d.sync.actualDiff.length).toEqual(0);

  const localRead = await d.local.read(new StoragePath("/file.txt"));
  expect(localRead.toString()).toEqual("hello, world!");

  const remoteRead = await d.remote.read(new StoragePath("/file.txt"));
  expect(remoteRead.toString()).toEqual("hello, world!");
});


it("no false conflicts on initial update", async () => {
  const d = await prepare();

  await write(d.local, "/file.txt", "hello, world!");
  await write(d.remote, "/file.txt", "hello, world!");

  await d.sync.updateDiff();
  expect(d.sync.actualDiff.length).toEqual(0);

  await write(d.local, "/file.txt", "hello, world updated");

  await d.sync.updateDiff();
  expect(d.sync.actualDiff.length).toEqual(1);
  expect(d.sync.actualDiff[0]!.diff).toEqual(SyncDiffType.LocalUpdate);
});


it("initial sync", async () => {
  const d = await prepare();

  await write(d.local, "/file.txt", "hello, world!");
  await write(d.remote, "/file.txt", "hello, world!");

  await d.sync.updateDiff();
  expect(d.sync.actualDiff).toHaveLength(0);
});


it("updating file after accepting does not break", async () => {
  const d = await prepare();

  await write(d.local, "/file.txt", "hello, world!");
  await d.sync.updateDiff();
  await d.sync.acceptMulti(d.sync.actualDiff);

  await write(d.local, "/file.txt", "hello, world updated!");

  await d.runner.run(true);
});
