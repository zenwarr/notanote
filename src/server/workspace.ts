import { CreateEntryReply, EntryInfo, EntryType, WorkspaceEntry } from "../common/WorkspaceEntry";
import fs from "fs";
import path from "path";
import { ErrorCode, isOk, Result } from "../common/errors";
import { randomUUID } from "crypto";


const WORKSPACES_DIR = process.env["WORKSPACES_DIR"] ?? "/workspaces";


export class Workspace {
  private constructor(root: string, id: string) {
    this.root = root;
    this.id = id;
  }


  static async getOrCreateWorkspace(userId: string, workspaceId?: string): Promise<Result<Workspace>> {
    workspaceId ??= "default";

    const workspaceRoot = getWorkspacePath(userId, workspaceId);
    if (!workspaceRoot) {
      return {
        error: ErrorCode.EntryNotFound,
        text: "workspace root not found"
      };
    }

    const exists = await this.exists(workspaceRoot);
    if (!isOk(exists)) {
      return exists;
    }

    if (exists.value) {
      return {
        value: new Workspace(userId, workspaceId)
      };
    }

    try {
      await fs.promises.mkdir(path.join(workspaceRoot, ".note"), {
        recursive: true
      });

      await fs.promises.writeFile(path.join(workspaceRoot, ".note", "settings.json"), "{\n  \n}", "utf-8");
    } catch (e) {
      return {
        error: ErrorCode.Internal,
        text: "failed to create workspace"
      };
    }

    return {
      value: new Workspace(workspaceRoot, workspaceId)
    };
  }


  private static async exists(workspaceRoot: string): Promise<Result<boolean>> {
    try {
      const stat = await fs.promises.stat(workspaceRoot);
      if (!stat.isDirectory()) {
        return {
          error: ErrorCode.Internal,
          text: "expected to be a directory"
        };
      }

      return { value: true };
    } catch (error) {
      if (error.code === "ENOENT") {
        return { value: false };
      } else {
        return {
          error: ErrorCode.Internal,
          text: "error checking workspace presence"
        };
      }
    }
  }


  async getAllEntries(): Promise<Result<WorkspaceEntry[]>> {
    return { value: await getFsEntries(this.root, this.root) };
  }


  async createEntry(parent: string, name: string, type: EntryType): Promise<Result<CreateEntryReply>> {
    const absoluteParentPath = joinNestedPathSecure(this.root, parent);
    if (!absoluteParentPath) {
      return {
        error: ErrorCode.InvalidRequestParams,
        text: "invalid parent path supplied"
      };
    }

    if (type === "dir" && !name) {
      return {
        error: ErrorCode.InvalidRequestParams,
        text: "name should be provided when creating a directory"
      };
    }

    if (!name) {
      name = randomUUID();
    }

    if (type === "file") {
      name = name + ".md";
    }

    const createdEntryPath = joinNestedPathSecure(absoluteParentPath, name);
    if (!createdEntryPath) {
      return {
        error: ErrorCode.InvalidRequestParams,
        text: "invalid entry path supplied"
      };
    }

    if (type === "dir") {
      await fs.promises.mkdir(createdEntryPath, {
        recursive: true
      });
    } else {
      await fs.promises.mkdir(absoluteParentPath, {
        recursive: true
      });

      await fs.promises.writeFile(createdEntryPath, "", "utf-8");
    }

    const entries = await getFsEntries(this.root, this.root);
    return {
      value: {
        path: path.relative(this.root, createdEntryPath),
        entries
      }
    };
  }


  async getEntry(filePath: string): Promise<Result<EntryInfo>> {
    const entryPath = joinNestedPathSecure(this.root, filePath);
    if (!entryPath) {
      return {
        error: ErrorCode.EntryNotFound,
        text: "entry not found"
      };
    }

    let content: string | undefined;
    try {
      content = await fs.promises.readFile(entryPath, "utf-8");
    } catch (error) {
      if (error.code === "ENOENT") {
        return {
          error: ErrorCode.EntryNotFound,
          text: "entry not found"
        };
      } else {
        throw error;
      }
    }

    return {
      value: { content }
    };
  }


  async saveEntry(filePath: string, content: string): Promise<Result<void>> {
    const absolutePath = joinNestedPathSecure(this.root, filePath);
    if (!absolutePath) {
      return {
        error: ErrorCode.EntryNotFound,
        text: "entry not found"
      };
    }

    await fs.promises.writeFile(absolutePath, content, "utf-8");
    return { value: undefined };
  }


  static getForId(userId: string, id: string): Workspace | undefined {
    const root = getWorkspacePath(userId, id);
    if (!root) {
      return undefined;
    }

    return new Workspace(root, id);
  }


  readonly root: string;
  readonly id: string;
}


const IGNORED_ENTRIES: string[] = [
  ".git",
  ".idea",
  "node_modules"
];


function getWorkspacePath(userId: string, workspaceId: string) {
  return joinNestedPathSecure(WORKSPACES_DIR, path.join(userId, workspaceId));
}


function joinNestedPathSecure(root: string, nested: string): string | undefined {
  if (nested.indexOf("\0") >= 0) {
    return undefined;
  }

  if (!root.endsWith(path.sep)) {
    root = root + path.sep;
  }

  const result = path.join(root, nested);
  if (!isPathInsideRoot(root, result)) {
    return undefined;
  }

  return result;
}


function addEndingPathSlash(p: string) {
  return p.endsWith(path.sep) ? p : p + path.sep;
}


function isPathInsideRoot(root: string, nested: string): boolean {
  if (addEndingPathSlash(root) === addEndingPathSlash(nested)) {
    return true;
  }

  return nested.startsWith(addEndingPathSlash(root));
}


async function getFsEntries(dir: string, rootDir: string): Promise<WorkspaceEntry[]> {
  const result: WorkspaceEntry[] = [];

  for (const entry of await fs.promises.readdir(dir)) {
    if (IGNORED_ENTRIES.includes(entry)) {
      continue;
    }

    const fullPath = path.join(dir, entry);
    const stats = await fs.promises.stat(fullPath);

    const wEntry: WorkspaceEntry = {
      id: path.relative(rootDir, fullPath),
      name: entry,
      type: stats.isDirectory() ? "dir" : "file"
    };
    result.push(wEntry);

    if (stats.isDirectory()) {
      wEntry.children = await getFsEntries(fullPath, rootDir);
    }
  }

  return result;
}
