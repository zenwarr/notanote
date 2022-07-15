import { FastifyInstance, FastifyRequest } from "fastify";
import { deserializeSyncEntry, SerializedSyncEntry, syncRemoteEntry, SyncEntry } from "../common/sync/StorageSync";
import { getProfile, requireAuthenticatedUser } from "./auth";
import S from "fluent-json-schema";
import { ErrorCode, LogicError } from "../common/errors";
import { commitAndPushChanges, initGithubIntegration } from "./github/Github";
import { buildStoragePlugin, clonePlugin, updatePlugin } from "./plugin/PluginManager";
import * as fs from "fs";
import { StoragePath } from "../common/storage/StoragePath";
import { ServerStorageFactory } from "./storage/ServerStorageFactory";
import { SerializableStorageEntryData } from "../common/workspace/SerializableStorageEntryData";
import { StorageEntryStats, StorageEntryType, StorageLayer } from "../common/storage/StorageLayer";


type StorageRouteParams = {
  storageId: string;
}


type FileRouteParams = {
  "*": string;
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

  app.get<{
    Params: StorageRouteParams
  }>("/api/storages/:storageId/tree", {
    schema: {
      params: S.object().prop("storageId", S.string().required())
    }
  }, async (req, res) => {
    const { storage } = await getStorage(req);
    const children = await getAllStorageEntries(storage, StoragePath.root);

    const data: SerializableStorageEntryData = {
      path: StoragePath.root.normalized,
      stats: await storage.get(StoragePath.root).stats(),
      children
    };

    return data;
  });


  /**
   * Create workspace entry
   */
  app.post<{
    Params: StorageRouteParams,
    Body: { entryPath: string; type: StorageEntryType, content?: string }
  }>("/api/storages/:storageId/files", {
    schema: {
      params: S.object().prop("storageId", S.string().required()),
      body: S.object().prop("entryPath", S.string().required())
      .prop("type", S.string().required())
      .prop("content", S.string())
    }
  }, async (req, res) => {
    const { storage } = await getStorage(req);
    if (req.body.type === StorageEntryType.Dir) {
      await storage.createDir(new StoragePath(req.body.entryPath));
    } else {
      await storage.get(new StoragePath(req.body.entryPath)).writeOrCreate(req.body.content ?? "");
    }

    return {};
  });


  app.get<{
    Params: StorageRouteParams & FileRouteParams,
    Querystring: { children?: boolean, text?: boolean }
  }>("/api/storages/:storageId/files/*", {
    schema: {
      params: S.object().prop("storageId", S.string().required())
      .prop("*", S.string().required()),
      querystring: S.object().prop("children", S.boolean())
      .prop("text", S.boolean())
    }
  }, async (req, res): Promise<string | SerializableStorageEntryData> => {
    const { storage } = await getStorage(req);

    const fileID = decodeURIComponent(req.params["*"]);
    const entry = storage.get(new StoragePath(fileID));
    if (!entry) {
      throw new LogicError(ErrorCode.NotFound, "file not found");
    }

    const stats = await entry.stats();
    const text = req.query.text ? await entry.readText() : undefined;

    const childrenEntries = req.query.children ? await entry.children() : undefined;
    const childrenStats: StorageEntryStats[] = [];

    if (childrenEntries) {
      await Promise.all(childrenEntries.map(async (child, index) => {
        childrenStats[index] = await child.stats();
      }));
    }

    const d: SerializableStorageEntryData = {
      path: entry.path.normalized,
      stats,
      textContent: text,
      children: childrenEntries?.map((child, index) => ({
        path: child.path.normalized,
        stats: childrenStats[index]!
      }))
    };

    return d;
  });


  app.delete<{
    Params: StorageRouteParams & FileRouteParams
  }>("/api/storages/:storageId/files/*", {
    schema: {
      params: S.object().prop("storageId", S.string().required())
      .prop("*", S.string().required())
    }
  }, async req => {
    const { storage } = await getStorage(req);

    const fileID = decodeURIComponent(req.params["*"]);
    const entry = await storage.get(new StoragePath(fileID));
    if (!entry) {
      throw new LogicError(ErrorCode.NotFound, "file not found");
    }

    await entry.remove();
    return {};
  });


  app.put<{
    Params: StorageRouteParams & FileRouteParams,
    Body: { content: string }
  }>("/api/storages/:storageId/files/*", {
    schema: {
      params: S.object().prop("storageId", S.string().required())
      .prop("*", S.string().required())
    }
  }, async (req, res) => {
    const fileID = decodeURIComponent(req.params["*"]);

    const { storage } = await getStorage(req);
    await storage.get(new StoragePath(fileID)).writeOrCreate(req.body.content);
    return {};
  });


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


const IGNORED_ENTRIES: string[] = [
  ".git",
  ".idea",
  "node_modules"
];


async function getAllStorageEntries(fs: StorageLayer, start: StoragePath): Promise<SerializableStorageEntryData[]> {
  const result: SerializableStorageEntryData[] = [];

  const entries = await fs.get(start).children();
  if (!entries) {
    return [];
  }

  for (const entry of entries) {
    if (IGNORED_ENTRIES.includes(entry.path.basename)) {
      continue;
    }

    const stats = await entry.stats();

    result.push({
      path: entry.path.normalized,
      stats,
      children: stats.isDirectory ? await getAllStorageEntries(fs, entry.path) : undefined
    });
  }

  return result;
}
