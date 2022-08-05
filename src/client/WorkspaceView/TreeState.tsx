import { FixedSizeNodeData } from "react-vtree";
import { StorageEntryData } from "@common/workspace/StorageEntryData";


export type TreeNodeData = FixedSizeNodeData & {
  data: StorageEntryData;
  level: number;
  state: TreeState;
}


export type TreeState = {
  root: StorageEntryData;
  selected: string | undefined;
  onSelect: (node: string) => void;
  expanded: string[];
}


export function* treeWalker(state: TreeState): any {
  function createEntry(e: StorageEntryData, level: number) {
    const d: TreeNodeData = {
      id: e.path.normalized,
      isOpenByDefault: state.expanded.includes(e.path.normalized),
      data: e,
      level,
      state
    };

    return {
      data: d
    };
  }

  const roots = state.root.children || [];
  if (!roots.length) {
    return;
  }

  for (const child of roots) {
    yield createEntry(child, 0);
  }

  while (true) {
    let yielded: { data: TreeNodeData } = yield;

    const item = yielded.data;
    for (const child of item.data.children || []) {
      yield createEntry(child, item.level + 1);
    }
  }
}
