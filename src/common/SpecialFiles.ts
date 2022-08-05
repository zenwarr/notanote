import { StoragePath } from "@storage/StoragePath";


export const SpecialFiles = {
  shouldReloadSettingsAfterSave: (filePath: StoragePath) => {
    return filePath.isEqual(new StoragePath(".note/settings.json"));
  }
};
