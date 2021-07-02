import { getProfile, requireAuthenticatedUser } from "./auth";
import { FastifyInstance } from "fastify";
import { Workspace } from "./workspace";
import { isOk } from "../common/errors";
import { writeResult } from "./server-utils";
import * as path from "path";


export default async function initUiRoutes(app: FastifyInstance) {
  requireAuthenticatedUser(app);

  app.get("/", async (req, res) => {
    const profile = getProfile(req);
    const workspace = await Workspace.getOrCreateWorkspace(profile.id);
    if (!isOk(workspace)) {
      return writeResult(res, workspace);
    }

    return res.view("index", {
      params: {
        userName: profile.name,
        workspaceId: workspace.value.id
      }
    });
  });

  app.get("/sw.js", async (req, res) => {
    return res.sendFile(path.join(__dirname, "../static/sw.js"));
  });
}
