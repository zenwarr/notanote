import { KVStorageLayer } from "../storage/KVStorageLayer";
import { MapKV } from "./map-kv";
import { StoragePath } from "../storage/StoragePath";
import { SyncEntry, syncEntry } from "../sync/StorageSync";
import { getContentHash } from "../sync/ContentIdentity";


const storage = new KVStorageLayer(new MapKV());


function addIdentity(entry: SyncEntry) {
  if (entry.isDir) {
    entry.identity = {
      hash: undefined,
      size: "unk"
    };
  } else if (entry.data) {
    entry.identity = {
      hash: getContentHash(entry.data),
      size: "unk"
    };
  }

  return entry;
}


it("should sync simple files", async () => {
  await storage.get(new StoragePath("file.txt")).writeOrCreate("Hello, world!");

  const r = await syncEntry(addIdentity({
    path: new StoragePath("new-dir"),
    isDir: true
  }), storage);

  console.log(r);
});
