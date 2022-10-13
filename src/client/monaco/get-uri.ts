import { StoragePath } from "@storage/storage-path";
import * as monaco from "monaco-editor";


export function getUriFromPath(path: StoragePath) {
  return monaco.Uri.parse(`nuclear-file:${ path.normalized }`);
}
