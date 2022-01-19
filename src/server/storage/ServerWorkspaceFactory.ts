import { joinNestedPathSecure, StorageLayer } from "../../common/storage/StorageLayer";
import { ErrorCode, LogicError } from "../../common/errors";
import { StoragePath } from "../../common/storage/StoragePath";
import path from "path";
import { Workspace } from "../../common/storage/Workspace";
import { FsStorageLayer } from "./FsStorageLayer";


export class ServerWorkspaceFactory {
  async getOrCreateWorkspace(userId: string, workspaceId?: string): Promise<Workspace> {
    workspaceId ??= "default";

    const root = getWorkspacePath(userId, workspaceId);
    if (!root) {
      throw new LogicError(ErrorCode.NotFound, "workspace root not found");
    }

    const baseLayer = new FsStorageLayer(root);

    if (await exists(baseLayer, StoragePath.root)) {
      return new Workspace(baseLayer, root, workspaceId);
    }

    const ws = new Workspace(baseLayer, root, workspaceId);
    await ws.createDefaults();
    return ws;
  }


  getForId(userId: string, id: string): Workspace | undefined {
    const root = getWorkspacePath(userId, id);
    if (!root) {
      return undefined;
    }

    return new Workspace(new FsStorageLayer(root), root, id);
  }


  static instance = new ServerWorkspaceFactory();
}


function getWorkspacePath(userId: string, workspaceId: string) {
  return joinNestedPathSecure(getCommonWorkspacesRoot(), path.join(userId, workspaceId));
}


async function exists(layer: StorageLayer, path: StoragePath): Promise<boolean> {
  const rootEntry = await layer.get(path);
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


function getCommonWorkspacesRoot() {
  return process.env["WORKSPACES_DIR"] ?? "/workspaces";
}
