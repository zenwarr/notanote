import { FastifyInstance } from "fastify";
import { requireAuthenticatedUser } from "./auth";


export default async function initApiRoutes(app: FastifyInstance) {
  requireAuthenticatedUser(app);

  // app.get("/api/workspaces/:workspaceID/tree", async (req, res) => {
  //   const ws = Workspace.getForId(req.params.workspaceID!);
  //   const r = await ws.getAllEntries();
  //
  //   writeResult(res, r);
  // });
  //
  // app.post("/api/workspaces/:workspaceID/files", async (req, res) => {
  //   const parent: string = req.body.parent || "";
  //   const name: string | undefined = req.body.name;
  //   const type: string = req.body.type;
  //
  //   const r = await Workspace.getForId(req.params.workspaceID!).createEntry(parent, name, type as EntryType);
  //
  //   writeResult(res, r);
  // });
  //
  // app.get("/api/workspaces/:workspaceID/files/:fileID", async (req, res) => {
  //   const fileID = decodeURIComponent(req.params["fileID"]!);
  //   const r = await Workspace.getForId(req.params.workspaceID!).getEntry(fileID);
  //
  //   writeResult(res, r);
  // });
  //
  // app.put("/api/workspaces/:workspaceID/files/:fileID", async (req, res) => {
  //   const fileID = decodeURIComponent(req.params["fileID"]!);
  //
  //   const r = await Workspace.getForId(req.params.workspaceID!).saveEntry(fileID, req.body.content);
  //
  //   writeResult(res, r);
  // });
}
