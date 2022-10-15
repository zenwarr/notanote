import { ErrorCode, LogicError } from "@common/errors";
import { StoragePath } from "@storage/storage-path";
import { ContentIdentity } from "@sync/content-identity";
import { SyncTarget } from "@sync/sync-target";
import { StorageSyncData } from "@sync/storage-sync-data";
import { FastifyInstance, FastifyRequest } from "fastify";
import S from "fluent-json-schema";
import { getProfile, requireAuthenticatedUser } from "./auth";
import { commitAndPushChanges, initGithubIntegration } from "./github/github";
import { ServerStorageFactory } from "./storage/server-storage-factory";


type StorageRouteParams = {
  storageId: string;
}


async function getStorage(req: FastifyRequest<{ Params: StorageRouteParams }>) {
  const profile = getProfile(req);
  const storage = await ServerStorageFactory.instance.getOrCreateForName(profile.id, req.params.storageId);
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

  app.get("/api/profile", async (req, res) => {
    const profile = getProfile(req);
    return {
      name: profile.name
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
    Params: StorageRouteParams
  }>("/api/storages/:storageId/config", {
    schema: {
      params: S.object().prop("storageId", S.string().required())
    }
  }, async (req) => {
    const d = await getStorage(req);
    const syncData = new StorageSyncData(d.storage);
    await syncData.initStorage();
    const id = (await syncData.getConfig())?.storageId;
    if (!id) {
      throw new LogicError(ErrorCode.Internal, "Storage id not defined");
    }

    return {
      id
    }
  });


  app.get<{
    Params: StorageRouteParams,
    Querystring: { path: string }
  }>("/api/storages/:storageId/sync/outline", {
    schema: {
      params: S.object().prop("storageId", S.string().required()),
      querystring: S.object().prop("path", S.string().required())
    }
  }, async (req, res) => {
    const s = await getStorage(req);
    const path = req.query.path;

    const worker = new SyncTarget(s.storage);
    const outline = await worker.getOutline(new StoragePath(path));
    return outline || [];
  });


  app.post<{
    Params: StorageRouteParams,
    Body: { path: string, data: Buffer, remoteIdentity: ContentIdentity }
  }>("/api/storages/:storageId/sync/update", {
    schema: {
      params: S.object().prop("storageId", S.string().required()),
      body: S.object().prop("path", S.string().required())
      .prop("data", S.object().required())
      .prop("remoteIdentity", S.string())
    }
  }, async (req, res) => {
    const s = await getStorage(req);
    const worker = new SyncTarget(s.storage);
    await worker.update(new StoragePath(req.body.path), req.body.data, req.body.remoteIdentity);
    return {};
  });


  app.post<{
    Params: StorageRouteParams,
    Body: { path: string, remoteIdentity: ContentIdentity }
  }>("/api/storages/:storageId/sync/create-dir", {
    schema: {
      params: S.object().prop("storageId", S.string().required()),
      body: S.object().prop("path", S.string().required())
      .prop("remoteIdentity", S.string())
    }
  }, async (req, res) => {
    const s = await getStorage(req);
    const worker = new SyncTarget(s.storage);
    await worker.createDir(new StoragePath(req.body.path), req.body.remoteIdentity);
    return {};
  });


  app.post<{
    Params: StorageRouteParams,
    Body: { path: string, remoteIdentity: ContentIdentity }
  }>("/api/storages/:storageId/sync/remove", {
    schema: {
      params: S.object().prop("storageId", S.string().required()),
      body: S.object().prop("path", S.string().required())
      .prop("remoteIdentity", S.string())
    }
  }, async (req, res) => {
    const s = await getStorage(req);
    const worker = new SyncTarget(s.storage);
    await worker.remove(new StoragePath(req.body.path), req.body.remoteIdentity);
    return {};
  });


  app.get<{
    Params: StorageRouteParams,
    Querystring: { path: string }
  }>("/api/storages/:storageId/sync/read", {
    schema: {
      params: S.object().prop("storageId", S.string().required()),
      querystring: S.object().prop("path", S.string().required())
    }
  }, async (req, res) => {
    const s = await getStorage(req);
    const path = req.query.path;

    const worker = new SyncTarget(s.storage);
    return worker.read(new StoragePath(path));
  });
}
