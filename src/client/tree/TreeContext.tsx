import * as React from "react";


export type TreeCtxData<T = {}> = T & {
  openMenu?: (x: number, y: number, id: string) => void;
  selected?: string;
  onSelect?: (node: string) => void;
  expanded: string[];
}


export const TreeContext = React.createContext<TreeCtxData | undefined>(undefined);


export function useTreeContext<T>() {
  const ctx = React.useContext(TreeContext);
  if (!ctx) {
    throw new Error("Expected to be inside TreeContext");
  }

  return ctx as TreeCtxData<T>;
}
