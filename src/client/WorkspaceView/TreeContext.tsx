import * as React from "react";
import { StoragePath } from "@storage/StoragePath";


export interface TreeCtxData {
  openMenu: (x: number, y: number, path: StoragePath) => void;
  closeMenu: () => void;
}


export const TreeContext = React.createContext<TreeCtxData | undefined>(undefined);


export function useTreeContext() {
  const ctx = React.useContext(TreeContext);
  if (!ctx) {
    throw new Error("Expected to be inside TreeContext");
  }

  return ctx;
}
