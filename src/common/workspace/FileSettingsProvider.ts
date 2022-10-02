import { patternMatches, singlePatternMatches } from "@common/utils/patterns";
import { EntryStorage, StorageErrorCode } from "@storage/EntryStorage";
import { StoragePath } from "@storage/StoragePath";
import { FileSettings } from "../Settings";
import { tryParseJson } from "../utils/tryParse";
import { SpecialPath } from "./Workspace";


interface WorkspaceSettings {
  settings?: FileSettings,
  patterns?: {
    files: string | string[];
    settings?: FileSettings
  }[]
}


export class FileSettingsProvider {
  constructor(fs: EntryStorage) {
    this.storage = fs;
  }


  async load(): Promise<void> {
    try {
      const text = (await this.storage.get(SpecialPath.Settings).read()).toString();
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
    const matching = this.settings?.patterns?.filter(pat => patternMatches(entryPath, pat.files));

    let specificSettings = {
      ...this.settings?.settings
    };

    for (const m of matching || []) {
      specificSettings = {
        ...specificSettings,
        ...m.settings
      };
    }

    if (entryPath.valueOf() === SpecialPath.PluginConfig.valueOf()) {
      specificSettings = {
        ...specificSettings,
        editor: {
          name: "pluginConfig.editor"
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


  static init(fs: EntryStorage): void {
    if (FileSettingsProvider._instance) {
      return;
    }

    FileSettingsProvider._instance = new FileSettingsProvider(fs);
  }


  private settings: WorkspaceSettings | undefined;
  private readonly storage: EntryStorage;
}


