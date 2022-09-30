import { EntryStorage } from "@storage/EntryStorage";
import { ErrorCode, LogicError } from "@common/errors";
import { joinNestedPathSecure, StoragePath } from "@storage/StoragePath";
import path from "path";
import { createWorkspaceDefaults, SpecialPath } from "@common/workspace/Workspace";
import { FsStorage } from "@storage/FsStorage";
import { PluginConfigStorageEntry } from "../plugin/PluginConfigEntry";
import { StorageWithMounts } from "@storage/StorageWithMounts";


export const DEFAULT_STORAGE_ID = "default";


export class ServerStorageFactory {
  async getOrCreateForId(userId: string, storageId: string): Promise<{ storage: EntryStorage, realRoot: string }> {
    const root = getStorageRoot(userId, storageId);
    if (!root) {
      throw new LogicError(ErrorCode.NotFound, "storage root not found");
    }

    const base = new FsStorage(root);
    const withMounts = new StorageWithMounts(base);
    withMounts.mount(SpecialPath.PluginConfig, new PluginConfigStorageEntry(storageId, root));

    if (!await exists(base, StoragePath.root)) {
      await createWorkspaceDefaults(base);
    }

    return {
      storage: withMounts,
      realRoot: root
    };
  }


  static instance = new ServerStorageFactory();
}


function getStorageRoot(userId: string, workspaceId: string) {
  return joinNestedPathSecure(getCommonStoragesRoot(), path.join(userId, workspaceId));
}


async function exists(storage: EntryStorage, path: StoragePath): Promise<boolean> {
  const rootEntry = await storage.get(path);
  if (!rootEntry) {
    return false;
  }

  const stat = await rootEntry.stats();
  if (!stat) {
    return false;
  }

  if (!stat.isDirectory) {
    throw new LogicError(ErrorCode.Internal, "expected to be a directory");
  }

  return true;
}


function getCommonStoragesRoot() {
  return process.env["STORAGES_DIR"] ?? "/workspaces";
}
