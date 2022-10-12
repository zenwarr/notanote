import { tryParseJson } from "@common/utils/tryParse";
import { StoragePath } from "@storage/storage-path";


export function getStoredEditorState(path: StoragePath, editor: string): unknown | undefined {
  const stored = localStorage.getItem(`stored-state-${editor}-${ path.normalized }`);
  if (!stored) {
    return undefined;
  }

  return tryParseJson(stored) || undefined
}


export function storeEditorState(path: StoragePath, editor: string, state: unknown) {
  localStorage.setItem(`stored-state-${editor}-${ path.normalized }`, JSON.stringify(state));
}
