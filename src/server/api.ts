import { ensureLoggedIn} from "./auth";
import express from "express";
import { EntryType} from "../common/WorkspaceEntry";
import { Workspace } from "./workspace";
import { writeResult } from "./server-utils";


export function initApiRoutes(app: express.Application) {
  app.get("/api/workspaces/:workspaceID/tree", ensureLoggedIn, async (req, res) => {
    const ws = Workspace.getForId(req.params.workspaceID!);
    const r = await ws.getAllEntries();

    writeResult(res, r);
  });

  app.post("/api/workspaces/:workspaceID/files", ensureLoggedIn, async (req, res) => {
    const parent: string = req.body.parent || "";
    const name: string | undefined = req.body.name;
    const type: string = req.body.type;

    const r = await Workspace.getForId(req.params.workspaceID!).createEntry(parent, name, type as EntryType);

    writeResult(res, r);
  });

  app.get("/api/workspaces/:workspaceID/files/:fileID", ensureLoggedIn, async (req, res) => {
    const fileID = decodeURIComponent(req.params["fileID"]!);
    const r = await Workspace.getForId(req.params.workspaceID!).getEntry(fileID);

    writeResult(res, r);
  });

  app.put("/api/workspaces/:workspaceID/files/:fileID", ensureLoggedIn, async (req, res) => {
    const fileID = decodeURIComponent(req.params["fileID"]!);

    const r = await Workspace.getForId(req.params.workspaceID!).saveEntry(fileID, req.body.content);

    writeResult(res, r);
  });
}
