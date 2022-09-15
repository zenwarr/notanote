import { KVEntryStorage } from "../KVEntryStorage";
import { StoragePath } from "../StoragePath";
import { MapKV } from "../MapKV";


const stor = new MapKV(new Map());


it("works", async () => {
  const storage = new KVEntryStorage(stor);
  const root = storage.get(StoragePath.root);
  expect(root).toBeDefined();

  await storage.createDir(new StoragePath("/foo"));
  expect(storage.get(new StoragePath("/foo"))).toBeDefined();
  const children = await root.children();
  expect(children.length).toBe(1);
  expect(children[0]?.path.normalized).toBe("/foo");

  const nested = await storage.createDir(new StoragePath("/foo/bar/nested"));
  expect(nested).toBeDefined();

  const file = await storage.get(new StoragePath("/foo/bar/nested/file"));
  expect(file).toBeDefined();
  expect(await file.exists()).toBe(false);

  await file.writeOrCreate(Buffer.from("Hello, world!"));
  expect(await file.exists()).toBe(true);
  expect(await file.read()).toBe("Hello, world!");
});
