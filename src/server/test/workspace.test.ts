import * as path from "path";
import { StoragePath } from "../../common/storage/StoragePath";
import { patternMatches } from "../../common/workspace/FileSettingsProvider";


beforeAll(() => {
  process.env["STORAGES_DIR"] = path.join(__dirname, "fixture");
});


describe("glob test", () => {
  it("matches", async () => {
    expect(patternMatches(new StoragePath("something.txt"), "something.txt")).toBeTruthy();
    expect(patternMatches(new StoragePath("something.txt"), "something.*")).toBeTruthy();
    expect(patternMatches(new StoragePath("something.txt"), "*")).toBeTruthy();
    expect(patternMatches(new StoragePath("something.txt"), "*.*")).toBeTruthy();
    expect(patternMatches(new StoragePath("nested/something.txt"), "something.txt")).toBeTruthy();
    expect(patternMatches(new StoragePath("nested/something.txt"), "nested/something.txt")).toBeTruthy();
    expect(patternMatches(new StoragePath("nested/something.txt"), "nested/*")).toBeTruthy();
    expect(patternMatches(new StoragePath("nested/something.txt"), "*")).toBeTruthy();
    expect(patternMatches(new StoragePath("nested/something.txt"), "*.*")).toBeTruthy();
    expect(patternMatches(new StoragePath("nested/something.txt"), "*/*")).toBeTruthy();
  });
});
