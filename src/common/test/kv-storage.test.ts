import { KVStorageLayer } from "../storage/KVStorageLayer";
import { StoragePath } from "../storage/StoragePath";
import { MapKV } from "./map-kv";


const storage = new MapKV(new Map());


it("works", async () => {
  const layer = new KVStorageLayer(storage);
  const root = layer.get(StoragePath.root);
  expect(root).toBeDefined();

  await layer.createDir(new StoragePath("/foo"));
  expect(layer.get(new StoragePath("/foo"))).toBeDefined();
  const children = await root.children();
  expect(children.length).toBe(1);
  expect(children[0]?.path.normalized).toBe("/foo");

  const nested = await layer.createDir(new StoragePath("/foo/bar/nested"));
  expect(nested).toBeDefined();

  const file = await layer.get(new StoragePath("/foo/bar/nested/file"));
  expect(file).toBeDefined();
  expect(await file.exists()).toBe(false);

  await file.writeOrCreate("Hello, world!");
  expect(await file.exists()).toBe(true);
  expect(await file.readText()).toBe("Hello, world!");
});
