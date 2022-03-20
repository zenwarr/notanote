import { MemoryStorageEntryPointer } from "../storage/MemoryStorage";
import { FixedSizeNodeData } from "react-vtree";


export type TreeNodeData = FixedSizeNodeData & {
  entry: MemoryStorageEntryPointer;
  level: number;
  state: TreeState;
}


export type TreeState = {
  root: MemoryStorageEntryPointer;
  selected: string | undefined;
  onSelect: (node: string) => void;
  expanded: string[];
}


export function* treeWalker(state: TreeState): any {
  function createEntry(e: MemoryStorageEntryPointer, level: number) {
    const d: TreeNodeData = {
      id: e.path.normalized,
      isOpenByDefault: state.expanded.includes(e.path.normalized),
      entry: e,
      level,
      state
    };
    return {
      data: d
    };
  }

  for (const child of state.root.directChildren || []) {
    yield createEntry(child, 0);
  }

  while (true) {
    const item: TreeNodeData = (yield).data;
    for (const child of item.entry.directChildren || []) {
      yield createEntry(child, item.level + 1);
    }
  }
}
