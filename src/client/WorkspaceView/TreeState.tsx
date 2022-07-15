import { FixedSizeNodeData } from "react-vtree";
import { SerializableStorageEntryData } from "../../common/workspace/SerializableStorageEntryData.js";
import * as mobx from "mobx";


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
