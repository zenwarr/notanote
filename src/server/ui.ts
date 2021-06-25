import { getProfile, requireAuthenticatedUser } from "./auth";
import { FastifyInstance } from "fastify";
import { Workspace } from "./workspace";
import { isOk } from "../common/errors";
import { writeResult } from "./server-utils";


export default async function initUiRoutes(app: FastifyInstance) {
  requireAuthenticatedUser(app);

  app.get("/", async (req, res) => {
    const profile = getProfile(req);
    const workspace = await Workspace.getOrCreateWorkspace(profile.id);
    if (!isOk(workspace)) {
      return writeResult(res, workspace);
    }

    return res.view("index", {
      userName: profile.name,
      params: {
        workspaceId: workspace.value.id
      }
    });
  });
}
