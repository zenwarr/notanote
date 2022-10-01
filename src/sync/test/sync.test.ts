import { KVEntryStorage } from "@storage/KVEntryStorage";
import { MapKV } from "@storage/MapKV";
import { EntryStorage } from "@storage/EntryStorage";
import { StoragePath } from "@storage/StoragePath";
import { StorageSyncData, StorageSyncConfig } from "@sync/StorageSyncData";
import { Sync, SyncDiffType } from "@sync/Sync";
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

  const runner = new SyncJobRunner(source, async cb => await cb());

  return { local, remote, source, runner };
}


async function write(storage: EntryStorage, path: string, data: string) {
  await storage.writeOrCreate(new StoragePath(path), Buffer.from(data));
}


it("diff between equal files", async () => {
  const d = await prepare();
  await write(d.local, "/file.txt", "hello world");
  await write(d.remote, "/file.txt", "hello world");

  await d.source.updateDiff();
  await d.source.acceptMulti(d.source.actualDiff);
  expect(d.source.actualDiff).toHaveLength(0);

  await d.source.updateDiff();
  expect(d.source.actualDiff).toHaveLength(0);
});


it("local file changed", async () => {
  const d = await prepare();
  await write(d.local, "/file.txt", "hello, world!");

  await d.source.updateDiff();
  await d.source.acceptMulti(d.source.actualDiff);

  await write(d.local, "/file.txt", "hello, world! updated");
  await write(d.remote, "/file.txt", "hello world");

  await d.source.updateDiff();
  expect(d.source.actualDiff).toHaveLength(1);
  expect(d.source.actualDiff[0]!.diff).toEqual(SyncDiffType.ConflictingCreate);
});


it("initializing from remote storage", async () => {
  const d = await prepare();
  await write(d.remote, "/file.txt", "hello world");
  await d.source.updateDiff();

  expect(d.source.actualDiff).toHaveLength(1);
  expect(d.source.actualDiff[0]!.diff).toEqual(SyncDiffType.RemoteCreate);

  await d.source.acceptMulti(d.source.actualDiff);
  const jobs = await d.source.getJobs(Infinity);
  for (const job of jobs) await d.source.doJob(job);

  await d.source.updateDiff();
  expect(d.source.actualDiff.length).toEqual(0);

  const localRead = await d.local.read(new StoragePath("/file.txt"));
  expect(localRead.toString()).toEqual("hello world");
});


it("resolving conflict by accepting local changes", async () => {
  const d = await prepare();
  await write(d.local, "file.txt", "local");
  await write(d.remote, "file.txt", "remote");
  await d.source.updateDiff();

  expect(d.source.actualDiff).toHaveLength(1);
  expect(d.source.actualDiff[0]!.diff).toEqual(SyncDiffType.ConflictingCreate);

  await d.source.accept(d.source.actualDiff[0]!, DiffAction.AcceptLocal);
  const jobs = await d.source.getJobs(Infinity);
  for (const job of jobs) await d.source.doJob(job);

  await d.source.updateDiff();
  expect(d.source.actualDiff.length).toEqual(0);

  const localRead = await d.local.read(new StoragePath("/file.txt"));
  expect(localRead.toString()).toEqual("local");

  const remoteRead = await d.remote.read(new StoragePath("/file.txt"));
  expect(remoteRead.toString()).toEqual("local");
});


it("resolving conflict by accepting remote changes", async () => {
  const d = await prepare();
  await write(d.local, "file.txt", "local");
  await write(d.remote, "file.txt", "remote");
  await d.source.updateDiff();

  expect(d.source.actualDiff).toHaveLength(1);
  expect(d.source.actualDiff[0]!.diff).toEqual(SyncDiffType.ConflictingCreate);

  await d.source.accept(d.source.actualDiff[0]!, DiffAction.AcceptRemote);
  const jobs = await d.source.getJobs(Infinity);
  for (const job of jobs) await d.source.doJob(job);

  await d.source.updateDiff();
  expect(d.source.actualDiff.length).toEqual(0);

  const localRead = await d.local.read(new StoragePath("/file.txt"));
  expect(localRead.toString()).toEqual("remote");

  const remoteRead = await d.remote.read(new StoragePath("/file.txt"));
  expect(remoteRead.toString()).toEqual("remote");
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

  await d.source.updateDiff();
  const jobs = await d.source.getJobs(Infinity);
  for (const job of jobs) await d.source.doJob(job);

  await d.source.updateDiff();
  expect(d.source.actualDiff.length).toEqual(0);

  const localRead = await d.local.read(new StoragePath("/file.txt"));
  expect(localRead.toString()).toEqual("hello, world!");

  const remoteRead = await d.remote.read(new StoragePath("/file.txt"));
  expect(remoteRead.toString()).toEqual("hello, world!");
});
