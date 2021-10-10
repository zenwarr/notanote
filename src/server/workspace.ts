import { CreateEntryReply, EntryInfo, EntryType, FileSettings, WorkspaceEntry } from "../common/WorkspaceEntry";
import fs from "fs";
import path from "path";
import { ErrorCode, LogicError } from "../common/errors";
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
      throw new LogicError(ErrorCode.NotFound, "workspace root not found");
    }

    const exists = await this.exists(workspaceRoot);

    if (exists) {
      return new Workspace(workspaceRoot, workspaceId);
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
        return matches(fileId, pat.files);
      } else {
        return pat.files.some(pattern => matches(fileId, pattern));
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
    return getFsEntries(this.root, this.root, relPath => {
      if (relPath.startsWith(".note/secrets")) {
        return { protected: true };
      } else {
        return undefined;
      }
    });
  }


  async createEntry(entryPath: string, type: EntryType): Promise<CreateEntryReply> {
    if (type === "file" && !entryPath.endsWith(".md")) {
      entryPath += ".md";
    }

    const absoluteEntryPath = joinNestedPathSecure(this.root, entryPath);
    if (!absoluteEntryPath) {
      throw new LogicError(ErrorCode.InvalidRequestParams, "invalid entry path supplied");
    }

    if (fs.existsSync(absoluteEntryPath)) {
      throw new LogicError(ErrorCode.AlreadyExists, "entry already exists");
    }

    if (type === "dir") {
      await fs.promises.mkdir(absoluteEntryPath, {
        recursive: true
      });
    } else {
      await fs.promises.mkdir(path.dirname(absoluteEntryPath), {
        recursive: true
      });

      await fs.promises.writeFile(absoluteEntryPath, "", "utf-8");
    }

    const entries = await this.getAllEntries();
    return {
      path: path.relative(this.root, absoluteEntryPath),
      entries
    };
  }


  async removeEntry(filePath: string): Promise<WorkspaceEntry[]> {
    const absoluteEntryPath = joinNestedPathSecure(this.root, filePath);
    if (!absoluteEntryPath) {
      throw new LogicError(ErrorCode.InvalidRequestParams, "invalid entry path supplied");
    }

    const stat = await fs.promises.stat(absoluteEntryPath);
    if (stat.isDirectory()) {
      await fs.promises.rmdir(absoluteEntryPath, {
        recursive: true
      });
    } else {
      await fs.promises.rm(absoluteEntryPath);
    }

    return this.getAllEntries();
  }


  async getEntry(filePath: string): Promise<EntryInfo> {
    const entryPath = joinNestedPathSecure(this.root, filePath);
    if (!entryPath) {
      throw new LogicError(ErrorCode.NotFound, "entry not found");
    }

    let content: string | undefined;
    try {
      content = await fs.promises.readFile(entryPath, "utf-8");
    } catch (error) {
      if (error.code === "ENOENT") {
        throw new LogicError(ErrorCode.NotFound, "entry not found");
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
      throw new LogicError(ErrorCode.NotFound, "entry not found");
    }

    await fs.promises.writeFile(absolutePath, content, "utf-8");
  }


  getSecretsDirectoryPath(): string {
    return path.join(".note", "secrets");
  }


  async getSecretsDirectoryPathAndEnsureItExists(): Promise<string> {
    const p = this.getSecretsDirectoryPath();
    await this.ensureDirectoryExists(p);
    return p;
  }


  toAbsolutePath(p: string): string | undefined {
    return joinNestedPathSecure(this.root, p);
  }


  async ensureDirectoryExists(dir: string): Promise<void> {
    const absolutePath = joinNestedPathSecure(this.root, dir);
    if (!absolutePath) {
      throw new LogicError(ErrorCode.NotFound, "directory does not exist");
    }

    await fs.promises.mkdir(absolutePath, {
      recursive: true
    });
  }


  async fileExists(dir: string): Promise<boolean> {
    const abs = this.toAbsolutePath(dir);
    if (!abs) {
      return false;
    }

    return fileExists(abs);
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


function matches(fileId: string, pattern: string): boolean {
  const simpleMode = pattern.match(/^\*\.\w+$/) != null;

  return micromatch.isMatch(fileId, pattern, {
    basename: simpleMode,
    dot: true
  });
}


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


async function getFsEntries(dir: string, rootDir: string,
                            getOptions?: (rootRelativePath: string, stat: fs.Stats) => Partial<WorkspaceEntry> | undefined): Promise<WorkspaceEntry[]> {
  const result: WorkspaceEntry[] = [];

  for (const entry of await fs.promises.readdir(dir)) {
    if (IGNORED_ENTRIES.includes(entry)) {
      continue;
    }

    const fullPath = path.join(dir, entry);
    const stats = await fs.promises.stat(fullPath);

    const rootRelativePath = path.relative(rootDir, fullPath);
    const wEntry: WorkspaceEntry = {
      id: rootRelativePath,
      name: entry,
      type: stats.isDirectory() ? "dir" : "file",
      ...getOptions?.(rootRelativePath, stats)
    };
    result.push(wEntry);

    if (stats.isDirectory()) {
      wEntry.children = await getFsEntries(fullPath, rootDir, getOptions);
    }
  }

  return result;
}


export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.stat(filePath);
    return true;
  } catch (err) {
    if (err.code === "ENOENT") {
      return false;
    } else {
      throw err;
    }
  }
}
