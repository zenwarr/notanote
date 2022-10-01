import { EntryStorage } from "@storage/EntryStorage";
import { ErrorCode, LogicError } from "@common/errors";
import { joinNestedPathSecure, StoragePath } from "@storage/StoragePath";
import path from "path";
import { createWorkspaceDefaults, SpecialPath } from "@common/workspace/Workspace";
import { FsStorage } from "@storage/FsStorage";
import { PluginConfigStorageEntry } from "../plugin/PluginConfigEntry";
import { StorageWithMounts } from "@storage/StorageWithMounts";


export class ServerStorageFactory {
  async getOrCreateForName(userId: string, storageName: string): Promise<{ storage: EntryStorage, realRoot: string }> {
    const root = getStorageRoot(userId, storageName);
    if (!root) {
      throw new LogicError(ErrorCode.NotFound, "storage root not found");
    }

    const base = new FsStorage(root);
    const withMounts = new StorageWithMounts(base);
    withMounts.mount(SpecialPath.PluginConfig, new PluginConfigStorageEntry(storageName, root));

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


function getStorageRoot(userId: string, storageName: string) {
  // check storage name is not empty and contains only latin letters
  if (!storageName || !storageName.match(/^[a-zA-Z0-9_-]+$/)) {
    throw new Error("Invalid storage name");
  }

  return joinNestedPathSecure(getCommonStoragesRoot(), path.join(userId, storageName));
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
