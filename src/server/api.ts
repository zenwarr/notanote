import { FastifyInstance, FastifyRequest } from "fastify";
import { syncRemoteEntry} from "@sync/RemoteSync";
import { deserializeSyncEntry, SerializedSyncEntry} from "@sync/SyncEntry";
import { getProfile, requireAuthenticatedUser } from "./auth";
import S from "fluent-json-schema";
import { ErrorCode, LogicError } from "@common/errors";
import { commitAndPushChanges, initGithubIntegration } from "./github/Github";
import { buildStoragePlugin, clonePlugin, updatePlugin } from "./plugin/PluginManager";
import * as fs from "fs";
import { ServerStorageFactory } from "./storage/ServerStorageFactory";


type StorageRouteParams = {
  storageId: string;
}


async function getStorage(req: FastifyRequest<{ Params: StorageRouteParams }>) {
  const profile = getProfile(req);
  const storage = await ServerStorageFactory.instance.getOrCreateForId(profile.id, req.params.storageId);
  if (!storage) {
    throw new LogicError(ErrorCode.NotFound, "workspace not found");
  }

  return storage;
}


export default async function initApiRoutes(app: FastifyInstance) {
  requireAuthenticatedUser(app);


  app.get("/api/latest-version", async req => {
    return {
      version: require("../package.json").version
    };
  });


  app.post<{
    Params: StorageRouteParams,
    Body: { email: string, remote: string }
  }>("/api/storages/:storageId/github/init", {
    schema: {
      params: S.object().prop("storageId", S.string().required()),
      body: S.object().prop("email", S.string().required()).prop("remote", S.string().required())
    }
  }, async (req, res) => {
    const { realRoot } = await getStorage(req);
    await initGithubIntegration(realRoot, req.body.email, req.body.remote);
    return {};
  });


  app.post<{
    Params: StorageRouteParams
  }>("/api/storages/:storageId/github/push", {
    schema: {
      params: S.object().prop("storageId", S.string().required())
    }
  }, async (req, res) => {
    const { realRoot } = await getStorage(req);

    await commitAndPushChanges(realRoot, undefined, true);

    return {};
  });


  app.get<{
    Params: StorageRouteParams & { pluginID: string }
  }>("/api/storages/:storageId/plugins/:pluginID", {
    schema: {
      params: S.object().prop("storageId", S.string().required()).prop("pluginID", S.string().required())
    }
  }, async (req, res) => {
    const { realRoot } = await getStorage(req);

    const plugin = await buildStoragePlugin(realRoot, req.params.pluginID);

    res.header("Content-Type", "application/javascript");
    return fs.promises.readFile(plugin.entryPointPath);
  });


  app.post<{
    Params: StorageRouteParams & { pluginID: string }
  }>("/api/storages/:storageId/plugins/:pluginID/update", {
    schema: {
      params: S.object().prop("storageId", S.string().required()).prop("pluginID", S.string().required())
    }
  }, async (req, res) => {
    const { realRoot } = await getStorage(req);

    await updatePlugin(realRoot, req.params.pluginID);

    return {};
  });


  app.post<{
    Params: StorageRouteParams,
    Body: { name: string, url: string }
  }>("/api/storages/:storageId/plugins", {
    schema: {
      params: S.object().prop("storageId", S.string().required()),
      body: S.object().prop("name", S.string().required()).prop("url", S.string().required())
    }
  }, async (req, res) => {
    const { realRoot } = await getStorage(req);

    await clonePlugin(realRoot, req.body.name, req.body.url);

    return {};
  });


  app.post<{
    Params: StorageRouteParams,
    Body: { entry: SerializedSyncEntry }
  }>("/api/storages/:storageId/sync", {
    schema: {
      params: S.object().prop("storageId", S.string().required())
    }
  }, async (req, res) => {
    const s = await getStorage(req);
    return syncRemoteEntry(deserializeSyncEntry(req.body.entry), s.storage);
  });
}
