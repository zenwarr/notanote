import { FsStorage } from "../storage/FsStorage";
import * as path from "path";
import { StoragePath } from "../../common/storage/StoragePath";
import { StorageErrorCode } from "../../common/storage/StorageLayer";
import { MemoryStorage } from "../../client/storage/MemoryStorage";


// class TestFsEntry extends RuntimeStorageEntry {
//   override async readText() {
//     return "test";
//   }
// }

describe("fs storage", () => {
  let fs!: FsStorage;

  beforeEach(() => {
    fs = new FsStorage(path.join(__dirname, "test_data"));
  });

  it("should get root", () => {
    const entry = fs.get(StoragePath.root);
    expect(entry).toBeDefined();
  });

  it("should read file", async () => {
    expect(await fs.get(new StoragePath("test.file.txt")).readText()).toEqual("hello, world\n");
  });

  it("exists", async () => {
    expect(await fs.get(new StoragePath("test.file.txt")).exists()).toBeTruthy();
    expect(await fs.get(new StoragePath("another-test.file.txt")).exists()).toBeFalsy();
  });

  it("should list", async () => {
    const entries = await fs.get(StoragePath.root).children();
    expect(entries.length).toEqual(1);
    expect(entries.map(e => e.path.normalized)).toEqual([ "/test.file.txt" ]);
  });

  it("should not list file", async () => {
    const entriesPromise = fs.get(new StoragePath("test.file.txt")).children();
    await expect(entriesPromise).rejects.toHaveProperty("code", StorageErrorCode.NotDirectory);
  });

  it("should not list non-existent entry", async () => {
    const entriesPromise = fs.get(new StoragePath("non-existent")).children();
    await expect(entriesPromise).rejects.toHaveProperty("code", StorageErrorCode.NotExists);
  });
});


describe("memory storage", () => {
  let fs: MemoryStorage;

  beforeEach(async () => {
    fs = new MemoryStorage();
  });

  it("creates dir", async () => {
    await fs.createDir(new StoragePath("/new"));
    let children = (await fs.get(StoragePath.root).children()).map(c => c.path.basename);
    expect(children).toEqual([ "new" ]);

    await fs.createDir(new StoragePath("/new/nested"));
    children = (await fs.get(new StoragePath("/")).children()).map(c => c.path.basename);
    const newChildren = (await fs.get(new StoragePath("/new")).children()).map(c => c.path.basename);
    expect(children).toEqual([ "new" ]);
    expect(newChildren).toEqual([ "nested" ]);
  });

  it("creates nested dirs", async () => {
    await fs.createDir(new StoragePath("/a/b/c/d"));
    let children = (await fs.get(new StoragePath("/")).children()).map(c => c.path.basename);
    expect(children).toEqual([ "a" ]);

    children = (await fs.get(new StoragePath("/a/b")).children()).map(c => c.path.basename);
    expect(children).toEqual([ "c" ]);
  });

  it("creates file", async () => {
    let file = fs.get(new StoragePath("/a/b/c.txt"));
    await file.writeOrCreate("new file content");

    file = await fs.get(new StoragePath("/a/b/c.txt"));
    expect(await file.exists()).toBeTruthy();
    expect(await file.readText()).toEqual("new file content");
  });

  it("removes", async () => {
    let file = fs.get(new StoragePath("/a/b/c/d.txt"));
    await file.writeOrCreate("new file content");

    const c = fs.get(new StoragePath("/a/b/c"));
    await c.remove();
    expect(await c.exists()).toBeFalsy();

    file = fs.get(new StoragePath("/a/b/c/d.txt"));
    expect(await file.exists()).toBeFalsy();

    const b = fs.get(new StoragePath("/a/b"));
    expect(await b.exists()).toBeTruthy();
  });

  it("correct entry path", async () => {
    await fs.createDir(new StoragePath("/a/b"));

    let file = fs.get(new StoragePath("/a/b/c.txt"));
    expect(file.path.normalized).toEqual("/a/b/c.txt");
  });
});


// it("mounts", async () => {
//   const fs = new CompositeFileStorage(new FsStorageLayer(path.join(__dirname, "test_data")));
//
//   fs.mount(new TestFsEntry(new StoragePath("/mounted.txt")));
//
//   const text = await (await fs.get(new StoragePath("mounted.txt")))?.readText();
//   expect(text).toEqual("test");
//
//   const file = await (await fs.get(new StoragePath("/test.file.txt")))?.readText();
//   expect(file).toEqual("hello, world\n");
//
//   const list = await fs.get(StoragePath.root).children();
//   console.log(list);
// });
