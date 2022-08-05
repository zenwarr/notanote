import { StorageLayer, StorageErrorCode } from "@storage/StorageLayer";
import { tryParseJson } from "../utils/tryParse";
import { SpecialWorkspaceEntry } from "./Workspace";
import { FileSettings } from "../Settings";
import { StoragePath } from "@storage/StoragePath";


interface WorkspaceSettings {
  settings?: FileSettings,
  patterns?: {
    files: string | string[];
    settings?: FileSettings
  }[]
}


export class FileSettingsProvider {
  constructor(fs: StorageLayer) {
    this.fs = fs;
  }


  async load(): Promise<void> {
    try {
      const text = (await this.fs.get(SpecialWorkspaceEntry.Settings).read()).toString();
      if (!text) {
        return;
      }

      this.settings = tryParseJson(text);
    } catch (error: any) {
      if (error.code === StorageErrorCode.NotExists) {
        this.settings = undefined;
      } else {
        throw error;
      }
    }
  }


  getSettingsForPath(entryPath: StoragePath): FileSettings {
    const matching = this.settings?.patterns?.filter(pat => {
      if (typeof pat.files === "string") {
        return patternMatches(entryPath, pat.files);
      } else {
        return pat.files.some(pattern => patternMatches(entryPath, pattern));
      }
    });

    let specificSettings = {
      ...this.settings?.settings
    };

    for (const m of matching || []) {
      specificSettings = {
        ...specificSettings,
        ...m.settings
      };
    }

    if (entryPath.valueOf() === SpecialWorkspaceEntry.PluginConfig.valueOf()) {
      specificSettings = {
        ...specificSettings,
        editor: {
          name: "pluginConfig.editor"
        }
      };
    } else if (entryPath.valueOf() === SpecialWorkspaceEntry.DeviceConfig.valueOf()) {
      specificSettings = {
        ...specificSettings,
        editor: {
          name: "deviceConfig.editor"
        }
      };
    }

    return specificSettings;
  }


  private static _instance: FileSettingsProvider | undefined;


  static get instance(): FileSettingsProvider {
    if (!FileSettingsProvider._instance) {
      throw new Error("FileSettingsProvider is not initialized");
    }
    return FileSettingsProvider._instance;
  }


  static init(fs: StorageLayer): void {
    if (FileSettingsProvider._instance) {
      console.error("FileSettingsProvider is already initialized");
      return;
    }
    FileSettingsProvider._instance = new FileSettingsProvider(fs);
  }


  private settings: WorkspaceSettings | undefined;
  private readonly fs: StorageLayer;
}


export function patternMatches(sp: StoragePath, pattern: string): boolean {
  if (!pattern.startsWith("/")) {
    pattern = "/" + pattern;
  }

  const re = new RegExp(pattern);
  return sp.normalized.match(re) != null;
}
