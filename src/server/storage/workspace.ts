import { CreateEntryReply, EntryInfo, EntryType, FileSettings, WorkspaceEntry } from "../../common/WorkspaceEntry";
import fs from "fs";
import path from "path";
import { ErrorCode, LogicError } from "../../common/errors";
import * as micromatch from "micromatch";
import { LayeredStorage } from "./LayeredStorage";
import { StorageEntry, joinNestedPathSecure } from "./AbstractStorageLayer";
import assert from "assert";
import { FsStorageLayer } from "./FsStorageLayer";
import { PluginConfigStorageEntry } from "./PluginConfigEntry";
import { StoragePath } from "./StoragePath";


interface WorkspaceSettings {
  settings?: FileSettings,
  patterns?: {
    files: string | string[];
    settings?: FileSettings
  }[]
}


export namespace SpecialEntry {
  export const SpecialRoot = new StoragePath(".note");
  export const Secrets = new StoragePath(".note/secrets");
  export const PluginConfig = new StoragePath(".note/plugins.json");
  export const Plugins = new StoragePath(".note/plugins");
  export const Settings = new StoragePath(".note/settings.json");
}


export class Workspace {
  private constructor(public readonly root: string, public readonly id: string) {
    this.storage = new LayeredStorage([ new FsStorageLayer(root) ]);
    this.storage.mount(new PluginConfigStorageEntry(this, SpecialEntry.PluginConfig));
  }


  private async createDefaults() {
    await this.storage.createDir(SpecialEntry.SpecialRoot);
    await this.storage.write(SpecialEntry.Settings, "{\n  \n}");
  }


  private readonly storage: LayeredStorage;


  static getCommonWorkspacesRoot() {
    return process.env["WORKSPACES_DIR"] ?? "/workspaces";
  }


  static async getOrCreateWorkspace(userId: string, workspaceId?: string): Promise<Workspace> {
    workspaceId ??= "default";

    const workspaceRoot = getWorkspacePath(userId, workspaceId);
    if (!workspaceRoot) {
      throw new LogicError(ErrorCode.NotFound, "workspace root not found");
    }

    if (await this.exists(workspaceRoot)) {
      return new Workspace(workspaceRoot, workspaceId);
    }

    const ws = new Workspace(workspaceRoot, workspaceId);
    await ws.createDefaults();
    return ws;
  }


  private async getSettingsForFile(fileId: StoragePath) {
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

    if (fileId.valueOf() === SpecialEntry.PluginConfig.valueOf()) {
      specificSettings = {
        ...specificSettings,
        editor: {
          name: "pluginConfig"
        }
      };
    }

    return specificSettings;
  }


  private async loadSettings(): Promise<WorkspaceSettings | undefined> {
    const file = await this.storage.get(SpecialEntry.Settings);
    if (!file) {
      return undefined;
    }

    const text = await file.readText();
    if (!text) {
      return undefined;
    }

    return JSON.parse(text);
  }


  private static async exists(workspaceRoot: string): Promise<boolean> {
    try {
      const stat = await fs.promises.stat(workspaceRoot);
      if (!stat.isDirectory()) {
        throw new LogicError(ErrorCode.Internal, "expected to be a directory");
      }

      return true;
    } catch (error: any) {
      if (error.code === "ENOENT") {
        return false;
      } else {
        throw new LogicError(ErrorCode.Internal, "error checking workspace presence");
      }
    }
  }


  async getAllEntries(): Promise<WorkspaceEntry[]> {
    return getFsEntries(this.storage, StoragePath.root);
  }


  async createEntry(entryPath: StoragePath, type: EntryType): Promise<CreateEntryReply> {
    if (type === "file" && !entryPath.path.endsWith(".md")) {
      entryPath = new StoragePath(entryPath.path + ".md");
    }

    if (await this.storage.get(entryPath)) {
      throw new LogicError(ErrorCode.AlreadyExists, "entry already exists");
    }

    let entry: StorageEntry;
    if (type === "dir") {
      entry = await this.storage.createDir(entryPath);
    } else {
      await this.storage.createDir(entryPath.parentDir());
      entry = await this.storage.write(entryPath, "");
    }

    const entries = await getFsEntries(this.storage, StoragePath.root);
    return {
      path: entry.getPath().path,
      entries
    };
  }


  async removeEntry(filePath: StoragePath): Promise<WorkspaceEntry[]> {
    await this.storage.remove(filePath);
    return this.getAllEntries();
  }


  async getEntry(filePath: StoragePath): Promise<EntryInfo> {
    let content = await this.storage.readText(filePath);
    if (content == null) {
      throw new LogicError(ErrorCode.NotFound, "entry not found");
    }

    return {
      settings: await this.getSettingsForFile(filePath),
      content
    };
  }


  async saveEntry(filePath: StoragePath, content: string): Promise<void> {
    await this.storage.write(filePath, content);
  }


  async ensureDirExists(path: StoragePath): Promise<void> {
    await this.storage.createDir(path);
  }


  toAbsolutePath(storagePath: StoragePath): string {
    const result = joinNestedPathSecure(this.root, storagePath.path);
    if (!result) {
      throw new LogicError(ErrorCode.Internal, "invalid path");
    }

    return result;
  }


  static getForId(userId: string, id: string): Workspace | undefined {
    const root = getWorkspacePath(userId, id);
    if (!root) {
      return undefined;
    }

    return new Workspace(root, id);
  }
}


const IGNORED_ENTRIES: string[] = [
  ".git",
  ".idea",
  "node_modules"
];


function matches(sp: StoragePath, pattern: string): boolean {
  const simpleMode = pattern.match(/^\*\.\w+$/) != null;

  return micromatch.isMatch(sp.path, pattern, {
    basename: simpleMode,
    dot: true
  });
}


function getWorkspacePath(userId: string, workspaceId: string) {
  return joinNestedPathSecure(Workspace.getCommonWorkspacesRoot(), path.join(userId, workspaceId));
}


async function getFsEntries(fs: LayeredStorage, start: StoragePath): Promise<WorkspaceEntry[]> {
  const result: WorkspaceEntry[] = [];

  const entries = await fs.list(start);
  if (!entries) {
    return [];
  }

  for (const entry of entries) {
    if (IGNORED_ENTRIES.includes(entry.getBasename())) {
      continue;
    }

    const stats = await entry.stats();
    assert(stats != null);

    const wEntry: WorkspaceEntry = {
      id: entry.getPath().path,
      name: entry.getBasename(),
      type: stats.isDirectory ? "dir" : "file",
      createTs: stats.createTs,
      updateTs: stats.updateTs
    };
    result.push(wEntry);

    if (stats.isDirectory) {
      wEntry.children = await getFsEntries(fs, entry.getPath());
    }
  }

  return result;
}


export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.stat(filePath);
    return true;
  } catch (err: any) {
    if (err.code === "ENOENT") {
      return false;
    } else {
      throw err;
    }
  }
}
