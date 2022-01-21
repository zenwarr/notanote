import * as path from "path";
import { patternMatches, Workspace } from "../../common/storage/Workspace";
import { ServerWorkspaceFactory } from "../storage/ServerWorkspaceFactory";
import { StoragePath } from "../../common/storage/StoragePath";


beforeAll(() => {
  process.env["WORKSPACES_DIR"] = path.join(__dirname, "fixture");
});


describe("workspace", () => {
  it("creates workspace", async () => {
    const ws = await ServerWorkspaceFactory.instance.getOrCreateWorkspace("test_user", "default");
  });
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
