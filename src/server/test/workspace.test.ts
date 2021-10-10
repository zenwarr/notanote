import * as path from "path";
import { Workspace } from "../workspace";


beforeAll(() => {
  process.env["WORKSPACES_DIR"] = path.join(__dirname, "fixture");
});


describe("workspace", () => {
  it("creates workspace", async () => {
    const ws = await Workspace.getOrCreateWorkspace("test_user", "default");
    const entries = await ws.getAllEntries();
    console.log(JSON.stringify(entries, null, 2));
  });
});
