import { KVEntryStorage } from "@storage/kv-entry-storage";
import { MapKV } from "@storage/map-kv";
import { EntryStorage } from "@storage/entry-storage";
import { StoragePath } from "@storage/storage-path";
import { StorageSyncData, StorageSyncConfig } from "@sync/storage-sync-data";
import { Sync } from "@sync/sync";
import { SyncDiffType } from "@sync/sync-diff-type";
import { SyncTarget } from "@sync/sync-target";
import { DiffAction } from "@sync/sync-metadata-storage";
import { SyncJobRunner } from "@sync/sync-job-runner";
import * as luxon from "luxon";


async function prepare(config?: StorageSyncConfig) {
  const local = new KVEntryStorage(new MapKV());
  const alt = new KVEntryStorage(new MapKV());

  const sd = new StorageSyncData(local);
  await sd.initStorage();
  if (config) {
    await sd.setConfig(config);
  }

  const altSd = new StorageSyncData(alt);
  await altSd.initStorage();
  if (config) {
    await altSd.setConfig(config);
  }

  const remote = new KVEntryStorage(new MapKV());
  const target = new SyncTarget(remote);

  const sync = new Sync(local, target);
  const runner = new SyncJobRunner(sync, { normalBackoffDelay: luxon.Duration.fromMillis(1) });

  const altSync = new Sync(alt, target);
  const altRunner = new SyncJobRunner(altSync, { normalBackoffDelay: luxon.Duration.fromMillis(1) });

  return { local, remote, sync, runner, alt, altSync, altRunner };
}


async function write(storage: EntryStorage, path: string, data: string) {
  await storage.writeOrCreate(new StoragePath(path), Buffer.from(data));
}


async function readString(storage: EntryStorage, path: string) {
  const d = await storage.read(new StoragePath(path));
  return d.toString();
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
  expect(d.sync.actualDiff[0]!.type).toEqual(SyncDiffType.ConflictingCreate);
});


it("initializing from remote storage", async () => {
  const d = await prepare();
  await write(d.remote, "/file.txt", "hello world");
  await d.sync.updateDiff();

  expect(d.sync.actualDiff).toHaveLength(1);
  expect(d.sync.actualDiff[0]!.type).toEqual(SyncDiffType.RemoteCreate);

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
  expect(d.sync.actualDiff[0]!.type).toEqual(SyncDiffType.ConflictingCreate);

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
  expect(d.sync.actualDiff[0]!.type).toEqual(SyncDiffType.ConflictingCreate);

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
  expect(d.sync.actualDiff[0]!.type).toEqual(SyncDiffType.LocalUpdate);
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


it("adding new directory with files", async () => {
  const d = await prepare({
    storageId: "test",
    diffRules: [
      {
        diff: [ SyncDiffType.LocalCreate, SyncDiffType.LocalUpdate, SyncDiffType.RemoteCreate, SyncDiffType.RemoteUpdate ],
        action: DiffAction.AcceptAuto,
      }
    ]
  });

  await write(d.local, "/file.txt", "hello, world!");
  await write(d.remote, "/file.txt", "hello, world!");
  await d.sync.updateDiff();
  await d.runner.run(true);
});


it("trying to remove", async () => {
  const d = await prepare({
    storageId: "test",
    diffRules: [
      {
        diff: [ SyncDiffType.LocalCreate, SyncDiffType.LocalUpdate, SyncDiffType.RemoteCreate, SyncDiffType.RemoteUpdate ],
        action: DiffAction.AcceptAuto,
      }
    ]
  });

  await write(d.local, "/file.txt", "hello, world!");

  await d.sync.updateDiff();
  await d.runner.run(true);

  await d.altSync.updateDiff();
  await d.altRunner.run(true);

  expect(await readString(d.local, "/file.txt")).toEqual("hello, world!");
  expect(await readString(d.remote, "/file.txt")).toEqual("hello, world!");
  expect(await readString(d.alt, "/file.txt")).toEqual("hello, world!");

  await d.local.remove(new StoragePath("/file.txt"));
  await d.sync.updateDiff();
  await d.sync.acceptMulti(d.sync.actualDiff);
  await d.runner.run(true);

  await d.altSync.updateDiff();
  await d.altSync.acceptMulti(d.altSync.actualDiff);
  await d.altRunner.run(true);

  expect(await d.local.exists(new StoragePath("/file.txt"))).toEqual(false);
  expect(await d.remote.exists(new StoragePath("/file.txt"))).toEqual(false);
  expect(await d.alt.exists(new StoragePath("/file.txt"))).toEqual(false);
});
