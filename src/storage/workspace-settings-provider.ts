import { patternMatches } from "@common/utils/patterns";
import { EntryStorage, StorageErrorCode } from "@storage/entry-storage";
import { StoragePath } from "@storage/storage-path";
import { StorageSyncConfig } from "@sync/storage-sync-data";
import { FileSettings } from "@common/Settings";
import { tryParseJson5 } from "@common/utils/tryParse";
import { SpecialPath } from "@storage/special-path";
import { ThemeConfig } from "../client/theme/theme-config";
import ajv from "ajv";
import * as mobx from "mobx";


interface WorkspaceSettings {
  settings?: FileSettings,
  patterns?: {
    files: string | string[];
    settings?: FileSettings
  }[];
  sync?: Omit<StorageSyncConfig, "storageId">;
  theme?: ThemeConfig;
}


const ajvValidator = new ajv();


export class WorkspaceSettingsProvider {
  constructor(fs: EntryStorage) {
    this.storage = fs;
    mobx.makeObservable(this, {
      settings: mobx.observable
    } as any);
  }


  async init() {
    return this.reload(undefined);
  }


  async reload(content: Buffer | undefined): Promise<void> {
    try {
      const text = (content || await this.storage.get(SpecialPath.Settings).read()).toString();
      if (!text) {
        return;
      }

      const settings = tryParseJson5(text);
      const isValid = this.validateSchema(settings);
      if (isValid) {
        this.settings = settings;
      } else {
        console.error(`Failed to parse workspace settings`, this.validateSchema.errors);
      }
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
  private readonly validateSchema = ajvValidator.compile(require("./workspace-settings-schema.json"));
}

