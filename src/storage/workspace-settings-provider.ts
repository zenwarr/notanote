import { patternMatches } from "@common/utils/patterns";
import { EntryStorage, StorageErrorCode } from "@storage/entry-storage";
import { StoragePath } from "@storage/storage-path";
import { StorageSyncConfig } from "@sync/StorageSyncData";
import { FileSettings } from "@common/Settings";
import { tryParseJson } from "@common/utils/tryParse";
import { SpecialPath } from "@storage/special-path";


interface WorkspaceSettings {
  settings?: FileSettings,
  patterns?: {
    files: string | string[];
    settings?: FileSettings
  }[];
  sync?: Omit<StorageSyncConfig, "storageId">;
}


export class WorkspaceSettingsProvider {
  constructor(fs: EntryStorage) {
    this.storage = fs;
  }


  async init(): Promise<void> {
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

    return specificSettings;
  }


  private static _instance: WorkspaceSettingsProvider | undefined;


  static get instance(): WorkspaceSettingsProvider {
    if (!WorkspaceSettingsProvider._instance) {
      throw new Error("FileSettingsProvider is not initialized");
    }

    return WorkspaceSettingsProvider._instance;
  }


  static init(fs: EntryStorage): void {
    if (WorkspaceSettingsProvider._instance) {
      return;
    }

    WorkspaceSettingsProvider._instance = new WorkspaceSettingsProvider(fs);
  }


  settings: WorkspaceSettings | undefined;
  private readonly storage: EntryStorage;
}

