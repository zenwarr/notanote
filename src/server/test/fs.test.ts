import { LayeredStorage } from "../storage/LayeredStorage";
import { FsStorageLayer } from "../storage/FsStorageLayer";
import * as path from "path";
import { RuntimeStorageEntry } from "../storage/RuntimeStorageEntry";
import { StoragePath } from "../storage/StoragePath";


class TestFsEntry extends RuntimeStorageEntry {
  override async readText() {
    return "test";
  }
}


it("mounts", async () => {
  const fs = new LayeredStorage([
    new FsStorageLayer(path.join(__dirname, "test_data"))
  ]);

  fs.mount(new TestFsEntry(new StoragePath("/mounted.txt")));

  const text = await fs.readText(new StoragePath("mounted.txt"));
  expect(text).toEqual("test");

  const file = await fs.readText(new StoragePath("/test.file.txt"));
  expect(file).toEqual("hello, world\n");

  const list = await fs.list(StoragePath.root);
  console.log(list);
});
