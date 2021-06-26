import { FastifyInstance, FastifyRequest } from "fastify";
import { getProfile, requireAuthenticatedUser } from "./auth";
import { Workspace } from "./workspace";
import { writeResult } from "./server-utils";
import S from "fluent-json-schema";
import { EntryType } from "../common/WorkspaceEntry";
import { ErrorCode, isOk, Result } from "../common/errors";


type WorkspaceRouteParams = {
  workspaceID: string;
}


type FileRouteParams = {
  fileID: string;
}


function getWorkspace(req: FastifyRequest<{
  Params: WorkspaceRouteParams
}>): Result<Workspace> {
  const profile = getProfile(req);
  const ws = Workspace.getForId(profile.id, req.params.workspaceID);
  if (!ws) {
    return {
      error: ErrorCode.EntryNotFound,
      text: "workspace not found"
    };
  }

  return { value: ws };
}


export default async function initApiRoutes(app: FastifyInstance) {
  requireAuthenticatedUser(app);

  app.get<{
    Params: WorkspaceRouteParams
  }>("/api/workspaces/:workspaceID/tree", {
    schema: {
      params: S.object().prop("workspaceID", S.string().required())
    }
  }, async (req, res) => {
    const ws = getWorkspace(req);
    if (!isOk(ws)) {
      return ws;
    }

    const r = await ws.value.getAllEntries();

    return writeResult(res, r);
  });


  app.post<{
    Params: WorkspaceRouteParams,
    Body: { parent: string; name: string; type: EntryType }
  }>("/api/workspaces/:workspaceID/files", {
    schema: {
      params: S.object().prop("workspaceID", S.string().required()),
      body: S.object().prop("parent", S.string().required())
      .prop("name", S.string().required())
      .prop("type", S.string().required())
    }
  }, async (req, res) => {
    const ws = getWorkspace(req);
    if (!isOk(ws)) {
      return ws;
    }

    const r = await ws.value.createEntry(req.body.parent || "", req.body.name, req.body.type as EntryType);

    return writeResult(res, r);
  });


  app.get<{
    Params: WorkspaceRouteParams & FileRouteParams
  }>("/api/workspaces/:workspaceID/files/:fileID", {
    schema: {
      params: S.object().prop("workspaceID", S.string().required())
      .prop("fileID", S.string().required())
    }
  }, async (req, res) => {
    const ws = getWorkspace(req);
    if (!isOk(ws)) {
      return ws;
    }

    const fileID = decodeURIComponent(req.params.fileID);
    const r = await ws.value.getEntry(fileID);

    return writeResult(res, r);
  });


  app.put<{
    Params: WorkspaceRouteParams & FileRouteParams,
    Body: { content: string }
  }>("/api/workspaces/:workspaceID/files/:fileID", {
    schema: {
      params: S.object().prop("workspaceID", S.string().required())
      .prop("fileID", S.string().required())
    }
  }, async (req, res) => {
    const fileID = decodeURIComponent(req.params.fileID);

    const ws = getWorkspace(req);
    if (!isOk(ws)) {
      return ws;
    }

    const r = await ws.value.saveEntry(fileID, req.body.content);

    return writeResult(res, r);
  });
}
