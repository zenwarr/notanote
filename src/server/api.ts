import { FastifyInstance, FastifyRequest } from "fastify";
import { getProfile, requireAuthenticatedUser } from "./auth";
import { Workspace } from "./workspace";
import S from "fluent-json-schema";
import { EntryType } from "../common/WorkspaceEntry";
import { ErrorCode, LogicError } from "../common/errors";
import { clone, commitAndPushChanges, initGithubIntegration } from "./github/Github";
import { asyncExists, buildPlugin, getBuildDirs } from "./plugin/PluginBuilder";
import * as path from "path";
import * as fs from "fs";


type WorkspaceRouteParams = {
  workspaceID: string;
}


type FileRouteParams = {
  "*": string;
}


function getWorkspace(req: FastifyRequest<{
  Params: WorkspaceRouteParams
}>): Workspace {
  const profile = getProfile(req);
  const ws = Workspace.getForId(profile.id, req.params.workspaceID);
  if (!ws) {
    throw new LogicError(ErrorCode.NotFound, "workspace not found");
  }

  return ws;
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
    return ws.getAllEntries();
  });


  app.post<{
    Params: WorkspaceRouteParams,
    Body: { entryPath: string; type: EntryType }
  }>("/api/workspaces/:workspaceID/files", {
    schema: {
      params: S.object().prop("workspaceID", S.string().required()),
      body: S.object().prop("entryPath", S.string().required())
      .prop("type", S.string().required())
    }
  }, async (req, res) => {
    const ws = getWorkspace(req);
    return ws.createEntry(req.body.entryPath, req.body.type as EntryType);
  });


  app.get<{
    Params: WorkspaceRouteParams & FileRouteParams
  }>("/api/workspaces/:workspaceID/files/*", {
    schema: {
      params: S.object().prop("workspaceID", S.string().required())
      .prop("*", S.string().required())
    }
  }, async (req, res) => {
    const ws = getWorkspace(req);

    const fileID = decodeURIComponent(req.params["*"]);
    return ws.getEntry(fileID);
  });


  app.delete<{
    Params: WorkspaceRouteParams & FileRouteParams
  }>("/api/workspaces/:workspaceID/files/*", {
    schema: {
      params: S.object().prop("workspaceID", S.string().required())
      .prop("*", S.string().required())
    }
  }, async req => {
    const ws = getWorkspace(req);

    const fileID = decodeURIComponent(req.params["*"]);
    return ws.removeEntry(fileID);
  });


  app.put<{
    Params: WorkspaceRouteParams & FileRouteParams,
    Body: { content: string }
  }>("/api/workspaces/:workspaceID/files/*", {
    schema: {
      params: S.object().prop("workspaceID", S.string().required())
      .prop("*", S.string().required())
    }
  }, async (req, res) => {
    const fileID = decodeURIComponent(req.params["*"]);

    const ws = getWorkspace(req);

    await ws.saveEntry(fileID, req.body.content);
    return {};
  });


  app.get("/api/latest-version", async req => {
    return {
      version: require("../package.json").version
    };
  });


  app.post<{
    Params: WorkspaceRouteParams,
    Body: { email: string, remote: string }
  }>("/api/workspaces/:workspaceID/github/init", {
    schema: {
      params: S.object().prop("workspaceID", S.string().required()),
      body: S.object().prop("email", S.string().required()).prop("remote", S.string().required())
    }
  }, async (req, res) => {
    const ws = getWorkspace(req);

    await initGithubIntegration(ws, req.body.email, req.body.remote)

    return {};
  });


  app.post<{
    Params: WorkspaceRouteParams
  }>("/api/workspaces/:workspaceID/github/push", {
    schema: {
      params: S.object().prop("workspaceID", S.string().required())
    }
  }, async (req, res) => {
    const ws = getWorkspace(req);

    await commitAndPushChanges(ws, undefined, true);

    return {};
  });


  app.get<{
    Params: WorkspaceRouteParams & { pluginID: string }
  }>("/api/workspaces/:workspaceID/plugins/:pluginID", {
    schema: {
      params: S.object().prop("workspaceID", S.string().required()).prop("pluginID", S.string().required())
    }
  }, async (req, res) => {
    const ws = getWorkspace(req);

    const pluginDir = path.join(ws.root, ".note/plugins", req.params.pluginID);
    const buildDirs = getBuildDirs(getProfile(req).id, ws.id, req.params.pluginID);
    const plugin = await buildPlugin(pluginDir, req.params.pluginID, buildDirs);

    res.header("Content-Type", "application/javascript");
    return fs.promises.readFile(plugin.entryPointPath);
  });


  app.post<{
    Params: WorkspaceRouteParams,
    Body: { name: string, url: string }
  }>("/api/workspaces/:workspaceID/plugins", {
    schema: {
      params: S.object().prop("workspaceID", S.string().required()),
      body: S.object().prop("name", S.string().required()).prop("url", S.string().required())
    }
  }, async (req, res) => {
    const ws = getWorkspace(req);

    const pluginDir = path.join(ws.root, ".note/plugins", req.body.name);
    if (await asyncExists(pluginDir)) {
      throw new LogicError(ErrorCode.AlreadyExists, `Plugin ${req.body.name} already exists`);
    }

    await clone(req.body.url, pluginDir);

    // const buildDirs = getBuildDirs(getProfile(req).id, ws.id, req.body.name);
    // await buildPlugin(pluginDir, req.body.name, buildDirs);

    return {};
  });
}
