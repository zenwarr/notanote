import { CreateEntryReply, EntryInfo, EntryType, FileSettings, WorkspaceEntry } from "../common/WorkspaceEntry";
import fs from "fs";
import path from "path";
import { ErrorCode, LogicError } from "../common/errors";
import { randomUUID } from "crypto";
import * as micromatch from "micromatch";


interface WorkspaceSettings {
  settings?: FileSettings,
  patterns?: {
    files: string | string[];
    settings?: FileSettings
  }[]
}


export class Workspace {
  private constructor(root: string, id: string) {
    this.root = root;
    this.id = id;
  }


  static getCommonWorkspacesRoot() {
    return process.env["WORKSPACES_DIR"] ?? "/workspaces";
  }


  static async getOrCreateWorkspace(userId: string, workspaceId?: string): Promise<Workspace> {
    workspaceId ??= "default";

    const workspaceRoot = getWorkspacePath(userId, workspaceId);
    if (!workspaceRoot) {
      throw new LogicError(ErrorCode.EntryNotFound, "workspace root not found");
    }

    const exists = await this.exists(workspaceRoot);

    if (exists) {
      return new Workspace(userId, workspaceId);
    }

    try {
      await fs.promises.mkdir(path.join(workspaceRoot, ".note"), {
        recursive: true
      });

      await fs.promises.writeFile(path.join(workspaceRoot, ".note", "settings.json"), "{\n  \n}", "utf-8");
    } catch (e) {
      throw new LogicError(ErrorCode.Internal, "failed to create workspace");
    }

    return new Workspace(workspaceRoot, workspaceId);
  }


  private async getSettingsForFile(fileId: string) {
    const settings = await this.loadSettings();
    const matching = settings?.patterns?.filter(pat => {
      if (typeof pat.files === "string") {
        return micromatch.isMatch(fileId, pat.files, {
          basename: true,
          dot: true
        });
      } else {
        return pat.files.some(pattern => micromatch.isMatch(fileId, pattern, {
          basename: true,
          dot: true
        }));
      }
    });

    let specificSettings = {
      ...settings?.settings
    };

    for (const m of matching || []) {
      specificSettings = {
        ...specificSettings,
        ...m.settings
      };
    }

    return specificSettings;
  }


  private async loadSettings(): Promise<WorkspaceSettings | undefined> {
    const settingFilePath = path.join(this.root, ".note", "settings.json");
    try {
      return JSON.parse(await fs.promises.readFile(settingFilePath, "utf-8"));
    } catch (error) {
      if (error.code === "ENOENT") {
        console.error("failed to load workspace settings", error);
      }
      return undefined;
    }
  }


  private static async exists(workspaceRoot: string): Promise<boolean> {
    try {
      const stat = await fs.promises.stat(workspaceRoot);
      if (!stat.isDirectory()) {
        throw new LogicError(ErrorCode.Internal, "expected to be a directory");
      }

      return true;
    } catch (error) {
      if (error.code === "ENOENT") {
        return false;
      } else {
        throw new LogicError(ErrorCode.Internal, "error checking workspace presence");
      }
    }
  }


  async getAllEntries(): Promise<WorkspaceEntry[]> {
    return getFsEntries(this.root, this.root);
  }


  async createEntry(parent: string, name: string, type: EntryType): Promise<CreateEntryReply> {
    const absoluteParentPath = joinNestedPathSecure(this.root, parent);
    if (!absoluteParentPath) {
      throw new LogicError(ErrorCode.InvalidRequestParams, "invalid parent path supplied");
    }

    if (type === "dir" && !name) {
      throw new LogicError(ErrorCode.InvalidRequestParams, "name should be provided when creating a directory");
    }

    if (!name) {
      name = randomUUID();
    }

    if (type === "file") {
      name = name + ".md";
    }

    const createdEntryPath = joinNestedPathSecure(absoluteParentPath, name);
    if (!createdEntryPath) {
      throw new LogicError(ErrorCode.InvalidRequestParams, "invalid entry path supplied");
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
      path: path.relative(this.root, createdEntryPath),
      entries
    };
  }


  async getEntry(filePath: string): Promise<EntryInfo> {
    const entryPath = joinNestedPathSecure(this.root, filePath);
    if (!entryPath) {
      throw new LogicError(ErrorCode.EntryNotFound, "entry not found");
    }

    let content: string | undefined;
    try {
      content = await fs.promises.readFile(entryPath, "utf-8");
    } catch (error) {
      if (error.code === "ENOENT") {
        throw new LogicError(ErrorCode.EntryNotFound, "entry not found");
      } else {
        throw error;
      }
    }

    return {
      settings: await this.getSettingsForFile(filePath),
      content
    };
  }


  async saveEntry(filePath: string, content: string): Promise<void> {
    const absolutePath = joinNestedPathSecure(this.root, filePath);
    if (!absolutePath) {
      throw new LogicError(ErrorCode.EntryNotFound, "entry not found");
    }

    await fs.promises.writeFile(absolutePath, content, "utf-8");
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
  return joinNestedPathSecure(Workspace.getCommonWorkspacesRoot(), path.join(userId, workspaceId));
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
