export const SpecialFiles = {
  shouldReloadSettingsAfterSave: (filePath: string) => {
    return filePath === ".note/settings.json";
  }
};
