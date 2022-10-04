import { resolveImport } from "@storage/resolve-import";
import { KVEntryStorage } from "@storage/kv-entry-storage";
import { MapKV } from "@storage/map-kv";
import { StoragePath } from "@storage/storage-path";


const stor = new KVEntryStorage(new MapKV(new Map()));


beforeAll(async () => {
  await stor.writeOrCreate(new StoragePath("/foo/bar.js"), Buffer.from(""));
  await stor.writeOrCreate(new StoragePath("/foo/baz.js"), Buffer.from(""));
  await stor.writeOrCreate(new StoragePath("/root-baz.js"), Buffer.from(""));
  await stor.writeOrCreate(new StoragePath("/foo/lib/index.js"), Buffer.from(""));
  await stor.writeOrCreate(new StoragePath("/foo/lib.js"), Buffer.from(""));
  await stor.writeOrCreate(new StoragePath("/foo/not-lib/file.js"), Buffer.from(""));

  await stor.writeOrCreate(new StoragePath("/foo/node_modules/pkg/package.json"), Buffer.from(JSON.stringify({})));
  await stor.writeOrCreate(new StoragePath("/foo/node_modules/pkg/index.js"), Buffer.from(""));
  await stor.writeOrCreate(new StoragePath("/foo/node_modules/pkg/lib.js"), Buffer.from(""));

  await stor.writeOrCreate(new StoragePath("/foo/node_modules/pkg2/package.json"), Buffer.from(JSON.stringify({
    main: "lib/main.js"
  })));
  await stor.writeOrCreate(new StoragePath("/foo/node_modules/pkg2/lib/main.js"), Buffer.from(""));

  await stor.writeOrCreate(new StoragePath("/foo/node_modules/pkg/node_modules/pkg3/package.json"), Buffer.from(JSON.stringify({})));
  await stor.writeOrCreate(new StoragePath("/foo/node_modules/pkg/node_modules/pkg3/index.js"), Buffer.from(""));
});


async function resolve(from: string, imp: string) {
  const r = await resolveImport(stor, new StoragePath(from), imp, {
    extensions: [ "js" ]
  });

  return r?.normalized;
}


it("relative import with extension", async () => {
  expect(await resolve("/foo/bar.js", "./baz.js")).toBe("/foo/baz.js");
});

it("relative import with extension when imported module does not exist", async () => {
  expect(await resolve("/foo/bar.js", "./baz2.js")).toBeUndefined();
});

it("relative import without extension", async () => {
  expect(await resolve("/foo/bar.js", "./baz")).toBe("/foo/baz.js");
});

it("relative import from parent directory", async () => {
  expect(await resolve("/foo/bar.js", "../root-baz")).toBe("/root-baz.js");
});

it("import from node_modules", async () => {
  expect(await resolve("/foo/bar.js", "pkg")).toEqual("/foo/node_modules/pkg/index.js");
});

it("import from node_modules package with main field", async () => {
  expect(await resolve("/foo/bar.js", "pkg2")).toEqual("/foo/node_modules/pkg2/lib/main.js");
});

it("import from nested node_modules", async () => {
  expect(await resolve("/foo/node_modules/pkg/index.js", "pkg3")).toEqual("/foo/node_modules/pkg/node_modules/pkg3/index.js");
});

it("import from parent node_modules when package not exists in nested node_modules", async () => {
  expect(await resolve("/foo/node_modules/pkg/index.js", "pkg2")).toEqual("/foo/node_modules/pkg2/lib/main.js");
});

it("import from node_modules when package does not exist", async () => {
  expect(await resolve("/foo/bar.js", "pkg4")).toBeUndefined();
});

it("import from module when node_modules does not exist", async () => {
  expect(await resolve("/bar.js", "pkg")).toBeUndefined();
});

it("import relative module from inside node_modules", async () => {
  expect(await resolve("/foo/node_modules/pkg/index.js", "./lib")).toEqual("/foo/node_modules/pkg/lib.js");
});

it("loading from directory", async () => {
  expect(await resolve("/foo/bar.js", "./lib")).toEqual("/foo/lib/index.js");
});

it("loading from a file with same name as a directory", async () => {
  expect(await resolve("/foo/bar.js", "./lib.js")).toEqual("/foo/lib.js");
});

it("import from a directory without index file is error", async () => {
  expect(await resolve("/foo/bar.js", "./not-lib")).toBeUndefined();
});
