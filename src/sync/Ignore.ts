import { SpecialPath } from "@storage/special-path";
import { StoragePath } from "@storage/storage-path";


export function shouldPathBeSynced(path: StoragePath) {
  return !(path.inside(SpecialPath.SyncDir, true) || path.inside(SpecialPath.Git, true));
}
