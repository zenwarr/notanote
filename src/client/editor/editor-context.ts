import { StoragePath } from "@storage/storage-path";
import * as React from "react";


export interface EditorCtxData {
  entryPath: StoragePath;
}


export const EditorContext = React.createContext<EditorCtxData | undefined>(undefined);


export function useEditorContext() {
  const ctx = React.useContext(EditorContext);
  if (!ctx) {
    throw new Error("Expected to be inside EditorContext");
  }

  return ctx;
}
