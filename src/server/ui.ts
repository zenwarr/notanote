import { getProfile, requireAuthenticatedUser } from "./auth";
import { FastifyInstance } from "fastify";
import { Workspace } from "./workspace";


export default async function initUiRoutes(app: FastifyInstance) {
  requireAuthenticatedUser(app);

  app.get("/", async (req, res) => {
    const profile = getProfile(req);
    const workspace = await Workspace.getOrCreateWorkspace(profile.id);

    return res.view("index", {
      params: {
        userName: profile.name,
        workspaceId: workspace.id
      }
    });
  });

  app.get("/sw.js", async (req, res) => {
    return res.sendFile("sw.js");
  });
}
