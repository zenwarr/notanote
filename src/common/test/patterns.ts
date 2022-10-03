import { singlePatternMatches } from "@common/utils/patterns";
import * as path from "path";
import { StoragePath } from "@storage/storage-path";


beforeAll(() => {
  process.env["STORAGES_DIR"] = path.join(__dirname, "fixture");
});


describe("glob test", () => {
  it("matches", async () => {
    expect(singlePatternMatches(new StoragePath("something.txt"), "something.txt")).toBeTruthy();
    expect(singlePatternMatches(new StoragePath("something.txt"), "something.*")).toBeTruthy();
    expect(singlePatternMatches(new StoragePath("something.txt"), "*")).toBeTruthy();
    expect(singlePatternMatches(new StoragePath("something.txt"), "*.*")).toBeTruthy();
    expect(singlePatternMatches(new StoragePath("nested/something.txt"), "something.txt")).toBeTruthy();
    expect(singlePatternMatches(new StoragePath("nested/something.txt"), "nested/something.txt")).toBeTruthy();
    expect(singlePatternMatches(new StoragePath("nested/something.txt"), "nested/*")).toBeTruthy();
    expect(singlePatternMatches(new StoragePath("nested/something.txt"), "*")).toBeTruthy();
    expect(singlePatternMatches(new StoragePath("nested/something.txt"), "*.*")).toBeTruthy();
    expect(singlePatternMatches(new StoragePath("nested/something.txt"), "*/*")).toBeTruthy();
  });
});
