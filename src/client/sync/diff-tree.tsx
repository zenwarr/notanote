import * as mobx from "mobx-react-lite";
import * as m from "mobx";
import { Box } from "@mui/material";
import { makeStyles } from "@mui/styles";
import { StoragePath } from "@storage/storage-path";
import { DirContentIdentity } from "@sync/content-identity";
import { SyncDiffEntry } from "@sync/sync-diff-entry";
import { useEffect, useMemo, useState } from "react";
import { FixedSizeTree } from "react-vtree";
import { TreeContext, TreeCtxData } from "tree/tree-context";
import { TreeNode } from "../tree/tree-node";
import { TreeNodeDataBox } from "../tree/tree-node-data";
import { ContainerWithSizeDetection } from "../utils/container-with-size-detection";
import { DiffTreeNode } from "./diff-tree-node";
import { DiffTreePanel } from "./diff-tree-panel";


export type DiffTreeProps = {
  diff: SyncDiffEntry[];
  width: number;
  height: number;
}


export const DiffTree = mobx.observer((props: DiffTreeProps) => {
  const [ selected, setSelected ] = useState<string | undefined>();
  const classes = useStyles();

  const treeCtx = useMemo<TreeCtxData>(() => ({
    expanded: [],
    selected,
    onSelect: setSelected
  }), [ selected ]);

  const selectedPath = useMemo(() => selected ? new StoragePath(selected) : undefined, [ selected ]);

  useEffect(() => {
    if (!props.diff.some(d => d.path.normalized === selected || (selectedPath && d.path.inside(selectedPath)))) {
      setSelected(undefined);
    }
  });

  // touch the entire tree deeply
  const _ = m.toJS(props.diff);

  return <>
    <Box mb={ 2 }>
      <DiffTreePanel selectedPath={ selectedPath } allDiffs={ props.diff }/>
    </Box>

    <ContainerWithSizeDetection className={ classes.container }>
      {
        (width, height) => <TreeContext.Provider value={ treeCtx }>
          {
              props.diff.length !== 0 && <FixedSizeTree itemSize={ 25 } height={ height } width={ width }
                                                        treeWalker={ diffTreeWalker.bind(null, props.diff) as any }>
                { TreeNode }
            </FixedSizeTree>
          }

          {
            props.diff.length === 0 && <div>
              No changes
            </div>
          }
        </TreeContext.Provider>
      }
    </ContainerWithSizeDetection>
  </>;
});


type DiffTreeNodeDataBox = TreeNodeDataBox<SyncDiffEntry | undefined>


function* diffTreeWalker(diffEntries: SyncDiffEntry[]): Generator<DiffTreeNodeDataBox | undefined, void, DiffTreeNodeDataBox> {
  if (!diffEntries.length) {
    return;
  }

  const allPaths = new Set<string>();
  const entries = new Map<string, SyncDiffEntry | undefined>();

  for (const diffEntry of diffEntries) {
    let cur = diffEntry.path;
    while (!cur.isEqual(StoragePath.root)) {
      allPaths.add(cur.normalized);
      cur = cur.parentDir;
    }

    entries.set(diffEntry.path.normalized, diffEntry);
  }

  function hasChildren(path: StoragePath) {
    for (const d of diffEntries) {
      if (d.path.inside(path, false)) {
        return true;
      }
    }

    return false;
  }

  function createEntry(path: StoragePath, d: SyncDiffEntry | undefined, level: number): DiffTreeNodeDataBox {
    let isDir: boolean;

    if (!d) {
      isDir = hasChildren(path);
    } else {
      isDir = d?.actual === DirContentIdentity
          || (d?.actual == null && d?.syncMetadata?.accepted === DirContentIdentity)
          || (d?.actual == null && d?.syncMetadata?.accepted == null && d?.syncMetadata?.synced === DirContentIdentity);
    }

    return {
      data: {
        id: path.normalized,
        isOpenByDefault: true,
        isDir,
        level,
        extra: d,
        content: <DiffTreeNode path={ path } diff={ d }/>
      }
    };
  }

  yield {
    data: {
      id: StoragePath.root.normalized,
      isOpenByDefault: true,
      isDir: true,
      level: 0,
      extra: undefined,
      content: <DiffTreeNode path={ StoragePath.root } diff={ undefined }/>
    }
  };

  while (true) {
    let yielded = yield;

    for (const path of allPaths.values()) {
      let p = new StoragePath(path);
      if (p.isDirectChildOf(new StoragePath(yielded.data.id))) {
        yield createEntry(p, entries.get(path), yielded.data.level + 1);
      }
    }
  }
}

const useStyles = makeStyles(theme => ({
  container: {
    minHeight: 500
  }
}));
