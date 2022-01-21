import { getProfile, requireAuthenticatedUser } from "./auth";
import { FastifyInstance } from "fastify";
import { Workspace } from "../common/storage/Workspace";
import { getWorkspacePlugins } from "./plugin/PluginManager";
import { ServerWorkspaceFactory } from "./storage/ServerWorkspaceFactory";


export default async function initUiRoutes(app: FastifyInstance) {
  requireAuthenticatedUser(app);

  app.get("/", async (req, res) => {
    const profile = getProfile(req);
    const workspace = await ServerWorkspaceFactory.instance.getOrCreateWorkspace(profile.id);

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
