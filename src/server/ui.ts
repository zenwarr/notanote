import { getProfile, requireAuthenticatedUser } from "./auth";
import { FastifyInstance } from "fastify";
import { getWorkspacePlugins } from "./plugin/PluginManager";
import { DEFAULT_STORAGE_ID, ServerStorageFactory } from "./storage/ServerStorageFactory";


export default async function initUiRoutes(app: FastifyInstance) {
  requireAuthenticatedUser(app);

  app.get("/", async (req, res) => {
    const profile = getProfile(req);
    const { realRoot } = await ServerStorageFactory.instance.getOrCreateForId(profile.id, DEFAULT_STORAGE_ID);

    return res.view("index", {
      params: {
        userName: profile.name,
        workspaceId: DEFAULT_STORAGE_ID,
        plugins: await getWorkspacePlugins(DEFAULT_STORAGE_ID, realRoot)
      }
    });
  });

  app.get("/sw.js", async (req, res) => {
    return res.sendFile("sw.js");
  });
}
