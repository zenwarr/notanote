import * as path from "path";
import { Workspace } from "../../common/storage/Workspace";
import { ServerWorkspaceFactory } from "../storage/ServerWorkspaceFactory";


beforeAll(() => {
  process.env["WORKSPACES_DIR"] = path.join(__dirname, "fixture");
});


describe("workspace", () => {
  it("creates workspace", async () => {
    const ws = await ServerWorkspaceFactory.instance.getOrCreateWorkspace("test_user", "default");
  });
});
