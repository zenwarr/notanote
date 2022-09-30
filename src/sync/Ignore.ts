import { SpecialPath } from "@common/workspace/Workspace";
import { StoragePath } from "@storage/StoragePath";


export function shouldPathBeSynced(path: StoragePath) {
  return !(path.inside(SpecialPath.SyncDir, true));
}
