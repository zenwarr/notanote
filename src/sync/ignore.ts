import { SpecialPath } from "@storage/special-path";
import { StoragePath } from "@storage/storage-path";


export function shouldPathBeSynced(path: StoragePath) {
  if (path.inside(SpecialPath.SyncDir, true) || path.inside(SpecialPath.Git, true)) {
    return false;
  }

  return !path.parts.some(x => x === "node_modules");
}
