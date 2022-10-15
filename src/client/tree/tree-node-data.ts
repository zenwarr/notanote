import * as React from "react";
import { FixedSizeNodeData } from "react-vtree";


export type TreeNodeData<T = never> = FixedSizeNodeData & {
  isDir: boolean;
  level: number;
  content: string | React.ReactNode;
  extra: T;
};


export type TreeNodeDataBox<T = never> = {
  data: TreeNodeData<T>
}
