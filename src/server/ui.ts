import { getProfile, requireAuthenticatedUser } from "./auth";
import { FastifyInstance } from "fastify";
import { Workspace } from "./storage/workspace";
import { getWorkspacePlugins } from "./plugin/PluginBuilder";


export default async function initUiRoutes(app: FastifyInstance) {
  requireAuthenticatedUser(app);

  app.get("/", async (req, res) => {
    const profile = getProfile(req);
    const workspace = await Workspace.getOrCreateWorkspace(profile.id);

    return res.view("index", {
      params: {
        userName: profile.name,
        workspaceId: workspace.id,
        plugins: await getWorkspacePlugins(workspace.id, workspace.root)
      }
    });
  });

  app.get("/sw.js", async (req, res) => {
    return res.sendFile("sw.js");
  });
}
