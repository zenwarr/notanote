import * as path from "path";
import { buildPlugin, getBuildDirs, getWorkspacePlugins } from "../plugin/PluginManager";


it("builds plugin", async () => {
  const dirs = getBuildDirs("test", "test", "test");
  const buildResult = await buildPlugin(path.join(__dirname, "fixture/test_user/default/.note/plugins/plugin"), "plugin", dirs);

  console.log(buildResult);
});


it("lists workspace plugins", async () => {
  const p = await getWorkspacePlugins("default", path.join(__dirname, "fixture/test_user/default"));
  console.log(p);
});
