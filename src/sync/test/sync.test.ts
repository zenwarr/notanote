import { MemorySyncMetadataStorage } from "@sync/MemorySyncMetadataStorage";
import * as _ from "lodash"
import { KVStorageLayer } from "@storage/KVStorageLayer";
import { MapKV } from "@storage/MapKV";
import { StorageLayer } from "@storage/StorageLayer";
import { StoragePath } from "@storage/StoragePath";
import { getContentIdentityForData } from "@sync/ContentIdentity";
import { LocalSyncWorker, SyncDiffType } from "@sync/LocalSyncWorker";
import { RemoteSyncWorker } from "@sync/RemoteSyncWorker";
import { SyncJobRunner } from "@sync/test/SyncJobRunner";


function prepare() {
  const local = new KVStorageLayer(new MapKV());

  const remote = new KVStorageLayer(new MapKV());
  const remoteSync = new RemoteSyncWorker(remote);

  const metadata = new MemorySyncMetadataStorage();
  const localSync = new LocalSyncWorker(local, remoteSync, metadata);

  const runner = new SyncJobRunner(localSync, async cb => await cb());

  return { local, remote, localSync, metadata, runner };
}


async function write(storage: StorageLayer, path: string, data: string) {
  await storage.writeOrCreate(new StoragePath(path), Buffer.from(data));
}


async function acceptLocal(storage: StorageLayer, sync: LocalSyncWorker, path: string) {
  let sp = new StoragePath(path);
  await sync.accept(sp, getContentIdentityForData(await storage.read(sp)), false);
}


async function acceptRemote(storage: StorageLayer, sync: LocalSyncWorker, path: string) {
  let sp = new StoragePath(path);
  await sync.accept(sp, getContentIdentityForData(await storage.read(sp)), true);
}


it("diff between equal files", async () => {
  const d = prepare();
  await write(d.local, "/file.txt", "hello world");
  await write(d.remote, "/file.txt", "hello world");
  await acceptLocal(d.local, d.localSync, "/file.txt");

  const diff = await d.localSync.getDiff(new StoragePath("/"));
  expect(diff).toHaveLength(0);
});


it("local file changed", async () => {
  const d = prepare();
  await write(d.local, "/file.txt", "hello, world!");
  await acceptLocal(d.local, d.localSync, "/file.txt");
  await write(d.local, "/file.txt", "hello, world! updated");
  await write(d.remote, "/file.txt", "hello world");

  const diff = await d.localSync.getDiff(new StoragePath("/"));
  expect(diff).toHaveLength(1);
  expect(diff[0]!.diff).toEqual(SyncDiffType.ConflictingCreate);
});


it("initializing from remote storage", async () => {
  const d = prepare();
  await write(d.remote, "/file.txt", "hello world");

  await d.localSync.updateDiff(new StoragePath("/"));
  const diff = d.localSync.actualDiff;
  expect(diff).toHaveLength(1);
  expect(diff[0]!.diff).toEqual(SyncDiffType.RemoteCreate);

  const accept = _.keyBy(diff, x => x.path.normalized);
  await d.localSync.acceptMulti(_.mapValues(accept, x => x.remote), true);
  const jobs = await d.localSync.getJobs(Infinity);
  for (const job of jobs) {
    await d.localSync.doJob(job);
  }

  await d.localSync.updateDiff(StoragePath.root);
  expect(d.localSync.actualDiff.length).toEqual(0);

  const localRead = await d.local.read(new StoragePath("/file.txt"));
  expect(localRead.toString()).toEqual("hello world");
});


it("jobs", async () => {
  const d = prepare();
  await write(d.local, "/file.txt", "hello, world!");
  await acceptLocal(d.local, d.localSync, "/file.txt");

  const jobs = await d.localSync.getJobs(3);
  expect(jobs).toHaveLength(1);
});
