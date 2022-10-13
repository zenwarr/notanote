import { patternMatches } from "@common/utils/patterns";
import { StoragePath } from "@storage/storage-path";
import { WorkspaceSettingsProvider } from "@storage/workspace-settings-provider";
import { useMemo } from "react";


/**
 * Should be used in observer components only
 */
export function useEntrySettingsInsideObserver(path: StoragePath) {
  return useMemo(() => {
    return WorkspaceSettingsProvider.instance.getSettingsForPath(path);
  }, [ path.normalized, WorkspaceSettingsProvider.instance.settings ]);
}
