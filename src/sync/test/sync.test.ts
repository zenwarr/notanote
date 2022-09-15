import { KVEntryStorage } from "@storage/KVEntryStorage";
import { MapKV } from "@storage/MapKV";
import { EntryStorage } from "@storage/EntryStorage";
import { StoragePath } from "@storage/StoragePath";
import { LocalSyncWorker, SyncDiffType } from "@sync/LocalSyncWorker";
import { MemorySyncMetadataStorage } from "@sync/MemorySyncMetadataStorage";
import { RemoteSyncWorker } from "@sync/RemoteSyncWorker";
import { DiffAction } from "@sync/SyncMetadataStorage";
import { SyncJobRunner } from "@sync/test/SyncJobRunner";


function prepare() {
  const local = new KVEntryStorage(new MapKV());

  const remote = new KVEntryStorage(new MapKV());
  const remoteSync = new RemoteSyncWorker(remote);

  const metadata = new MemorySyncMetadataStorage();
  const localSync = new LocalSyncWorker(local, remoteSync, metadata);

  const runner = new SyncJobRunner(localSync, async cb => await cb());

  return { local, remote, localSync, metadata, runner };
}


async function write(storage: EntryStorage, path: string, data: string) {
  await storage.writeOrCreate(new StoragePath(path), Buffer.from(data));
}


it("diff between equal files", async () => {
  const d = prepare();
  await write(d.local, "/file.txt", "hello world");
  await write(d.remote, "/file.txt", "hello world");

  await d.localSync.updateDiff();
  await d.localSync.acceptMulti(d.localSync.actualDiff);
  expect(d.localSync.actualDiff).toHaveLength(0);

  await d.localSync.updateDiff();
  expect(d.localSync.actualDiff).toHaveLength(0);
});


it("local file changed", async () => {
  const d = prepare();
  await write(d.local, "/file.txt", "hello, world!");

  await d.localSync.updateDiff();
  await d.localSync.acceptMulti(d.localSync.actualDiff);

  await write(d.local, "/file.txt", "hello, world! updated");
  await write(d.remote, "/file.txt", "hello world");

  await d.localSync.updateDiff();
  expect(d.localSync.actualDiff).toHaveLength(1);
  expect(d.localSync.actualDiff[0]!.diff).toEqual(SyncDiffType.ConflictingCreate);
});


it("initializing from remote storage", async () => {
  const d = prepare();
  await write(d.remote, "/file.txt", "hello world");
  await d.localSync.updateDiff();

  expect(d.localSync.actualDiff).toHaveLength(1);
  expect(d.localSync.actualDiff[0]!.diff).toEqual(SyncDiffType.RemoteCreate);

  await d.localSync.acceptMulti(d.localSync.actualDiff);
  const jobs = await d.localSync.getJobs(Infinity);
  for (const job of jobs) await d.localSync.doJob(job);

  await d.localSync.updateDiff();
  expect(d.localSync.actualDiff.length).toEqual(0);

  const localRead = await d.local.read(new StoragePath("/file.txt"));
  expect(localRead.toString()).toEqual("hello world");
});


it("resolving conflict by accepting local changes", async () => {
  const d = prepare();
  await write(d.local, "file.txt", "local");
  await write(d.remote, "file.txt", "remote");
  await d.localSync.updateDiff();

  expect(d.localSync.actualDiff).toHaveLength(1);
  expect(d.localSync.actualDiff[0]!.diff).toEqual(SyncDiffType.ConflictingCreate);

  await d.localSync.accept(d.localSync.actualDiff[0]!, DiffAction.AcceptLocal);
  const jobs = await d.localSync.getJobs(Infinity);
  for (const job of jobs) await d.localSync.doJob(job);

  await d.localSync.updateDiff();
  expect(d.localSync.actualDiff.length).toEqual(0);

  const localRead = await d.local.read(new StoragePath("/file.txt"));
  expect(localRead.toString()).toEqual("local");

  const remoteRead = await d.remote.read(new StoragePath("/file.txt"));
  expect(remoteRead.toString()).toEqual("local");
});


it("resolving conflict by accepting remote changes", async () => {
  const d = prepare();
  await write(d.local, "file.txt", "local");
  await write(d.remote, "file.txt", "remote");
  await d.localSync.updateDiff();

  expect(d.localSync.actualDiff).toHaveLength(1);
  expect(d.localSync.actualDiff[0]!.diff).toEqual(SyncDiffType.ConflictingCreate);

  await d.localSync.accept(d.localSync.actualDiff[0]!, DiffAction.AcceptRemote);
  const jobs = await d.localSync.getJobs(Infinity);
  for (const job of jobs) await d.localSync.doJob(job);

  await d.localSync.updateDiff();
  expect(d.localSync.actualDiff.length).toEqual(0);

  const localRead = await d.local.read(new StoragePath("/file.txt"));
  expect(localRead.toString()).toEqual("remote");

  const remoteRead = await d.remote.read(new StoragePath("/file.txt"));
  expect(remoteRead.toString()).toEqual("remote");
});
