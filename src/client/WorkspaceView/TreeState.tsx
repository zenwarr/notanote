import { FixedSizeNodeData } from "react-vtree";
import { SerializableStorageEntryData } from "../../common/workspace/SerializableStorageEntryData.js";


export type TreeNodeData = FixedSizeNodeData & {
  data: SerializableStorageEntryData;
  level: number;
  state: TreeState;
}


export type TreeState = {
  root: SerializableStorageEntryData;
  selected: string | undefined;
  onSelect: (node: string) => void;
  expanded: string[];
}


export function* treeWalker(state: TreeState): any {
  function createEntry(e: SerializableStorageEntryData, level: number) {
    const d: TreeNodeData = {
      id: e.path,
      isOpenByDefault: state.expanded.includes(e.path),
      data: e,
      level,
      state
    };

    return {
      data: d
    };
  }

  for (const child of state.root.children || []) {
    yield createEntry(child, 0);
  }

  while (true) {
    const item: TreeNodeData = (yield).data;
    for (const child of item.data.children || []) {
      yield createEntry(child, item.level + 1);
    }
  }
}
