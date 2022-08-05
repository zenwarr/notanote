import * as mobx from "mobx-react-lite"
import { FixedSizeTree, FixedSizeTreeProps } from "react-vtree";
import { walkStorageEntryData } from "@common/workspace/StorageEntryData";
import { TreeState, treeWalker } from "./TreeState";


export const TreeWrapper = mobx.observer((props: Omit<FixedSizeTreeProps<any>, "treeWalker"> & { state: TreeState }) => {
  const roots = props.state.root.children?.length;
  if (!roots) {
    return <div>
      Empty workspace
    </div>;
  }

  // we need to touch all nodes to subscribe to their changes because FixedTreeSize is not a mobx observer
  for (const _ of walkStorageEntryData(props.state.root)) {}

  return <FixedSizeTree { ...props as any } treeWalker={ treeWalker.bind(null, props.state) }/>;
});
