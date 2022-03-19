import * as React from "react";
import { useEffect, useRef, useState } from "react";
import cn from "classnames";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { Box, IconButton, Tooltip } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { ClientWorkspace } from "./ClientWorkspace";
import { observer } from "mobx-react-lite";
import { CreateEntryDialog } from "./CreateEntryDialog";
import { CreateNewFolderOutlined, DeleteForever, PostAddOutlined } from "@mui/icons-material";
import { useNavigate } from "react-router";
import DescriptionIcon from "@mui/icons-material/Description";
import FolderIcon from "@mui/icons-material/Folder";
import { format } from "date-fns";
import { StoragePath } from "../common/storage/StoragePath";
import { StorageEntryType } from "../common/storage/StorageLayer";
import { MemoryCachedEntryPointer } from "../common/storage/MemoryCachedStorage";
import { MemoryStorageEntryPointer } from "./storage/MemoryStorage";
import { FixedSizeNodeData, FixedSizeTree } from "react-vtree";
import { ContainerWithSizeDetection } from "./utils/ContainerWithSizeDetection";


export interface WorkspaceViewProps {
  onEntrySelected?: (entry: MemoryCachedEntryPointer) => void;
  treeWithPadding?: boolean;
}


function getParents(p: string) {
  const parts = p.split("/").filter(x => !!x);
  const result: string[] = [];
  for (let q = 0; q < parts.length; ++q) {
    result.push("/" + parts.slice(0, q + 1).join("/"));
  }
  return result;
}


function useExpanded(selected: string | undefined) {
  const [ expanded, setExpanded ] = useState<string[]>(selected ? [ ...getParents(selected) ] : []);

  return {
    expanded,
    onToggle: (node: string) => {
      const isAlreadyExpanded = expanded.includes(node);
      if (isAlreadyExpanded) {
        // collapse this item and all its children
        setExpanded(expanded.filter(x => x !== node && !x.startsWith(node + "/")));
      } else {
        const parents = getParents(node);
        setExpanded([ ...new Set([ ...expanded, ...parents ]) ]);
      }
    }
  };
}


interface CreateOptions {
  parentPath: StoragePath;
  suggestedName: string;
  type: StorageEntryType;
}


function getCreateOptions(selectedPath: StoragePath | undefined, createType: StorageEntryType): CreateOptions {
  let parentPath: StoragePath;

  if (!selectedPath) {
    parentPath = StoragePath.root;
  } else {
    const entry = ClientWorkspace.instance.storage.get(selectedPath);
    if (!entry) {
      parentPath = StoragePath.root;
    } else if (entry.memory.type === StorageEntryType.Dir) {
      parentPath = selectedPath;
    } else {
      parentPath = selectedPath.parentDir;
    }
  }

  let suggestedName = createType === StorageEntryType.Dir ? "new-dir" : "new-file.md";

  return {
    type: createType,
    parentPath,
    suggestedName
  };
}


export const WorkspaceView = observer((props: WorkspaceViewProps) => {
  const cw = ClientWorkspace.instance;
  const [ entryDialogOpened, setEntryDialogOpened ] = useState(false);
  const expand = useExpanded(cw.selectedEntry?.normalized);
  const createOptions = useRef<CreateOptions | undefined>(undefined);

  const navigate = useNavigate();
  const classes = useStyles();

  useEffect(() => {
    console.log("mount");

    return () => {
      console.log("unmount");
    }
  }, []);

  function onNodeSelect(value: string) {
    expand.onToggle(value);
    ClientWorkspace.instance.selectedEntry = new StoragePath(value);

    const selectedEntry = ClientWorkspace.instance.storage.get(new StoragePath(value));
    if (selectedEntry && selectedEntry.memory.type !== StorageEntryType.Dir) {
      navigate(`/f/${ value }`);
    }

    if (selectedEntry) {
      props.onEntrySelected?.(selectedEntry);
    }
  }

  function createFile() {
    createOptions.current = getCreateOptions(cw.selectedEntry, StorageEntryType.File);
    setEntryDialogOpened(true);
  }

  function createFolder() {
    createOptions.current = getCreateOptions(cw.selectedEntry, StorageEntryType.Dir);
    setEntryDialogOpened(true);
  }

  function onCreateDialogClose() {
    createOptions.current = undefined;
    setEntryDialogOpened(false);
  }

  async function remove() {
    if (!cw.selectedEntry || !confirm("Are you sure you want to remove it?\n\n" + cw.selectedEntry)) {
      return;
    }

    await ClientWorkspace.instance.remove(cw.selectedEntry);
  }

  const treeState: TreeState = {
    root: cw.storage.memory.root,
    selected: cw.selectedEntry?.normalized || "",
    onSelect: onNodeSelect,
    expanded: expand.expanded
  };

  const containerClassName = cn(classes.treeContainer, { [classes.treeContainerPadding]: props.treeWithPadding });

  return <>
    { createOptions.current && <CreateEntryDialog open={ entryDialogOpened }
                                                  onClose={ onCreateDialogClose }
                                                  type={ createOptions.current.type }
                                                  suggestedName={ createOptions.current.suggestedName }
                                                  parentPath={ createOptions.current.parentPath }/> }

    <Box mb={ 2 } display={ "flex" } justifyContent={ "space-between" } className={ classes.toolbar }>
      <Box>
        <IconButton onClick={ createFile } title={ "Create file" } size="large">
          <PostAddOutlined/>
        </IconButton>

        <IconButton onClick={ createFolder } title={ "Create folder" } size="large">
          <CreateNewFolderOutlined/>
        </IconButton>
      </Box>

      <Box>
        <IconButton
            onClick={ remove }
            title={ "Remove selected" }
            disabled={ !cw.selectedEntry }
            size="large">
          <DeleteForever color={ "error" }/>
        </IconButton>
      </Box>
    </Box>

    <ContainerWithSizeDetection className={ containerClassName }>
      {
        (width, height) => <FixedSizeTree treeWalker={ treeWalker.bind(null, treeState) } itemSize={ 25 } height={ height }
                                          width={ width }>
          { TreeNode as any }
        </FixedSizeTree>
      }
    </ContainerWithSizeDetection>
  </>;
});


type TreeNodeData = FixedSizeNodeData & {
  entry: MemoryStorageEntryPointer;
  level: number;
  state: TreeState;
}


type TreeState = {
  root: MemoryStorageEntryPointer;
  selected: string | undefined;
  onSelect: (node: string) => void;
  expanded: string[];
}


function* treeWalker(state: TreeState): any {
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


interface TreeNodeProps {
  data: TreeNodeData;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  style: any;
}


function TreeNode(props: TreeNodeProps) {
  const e = props.data.entry;
  const classes = useStyles();

  const id = props.data.entry.path.normalized;
  const isSelected = props.data.state.selected === id;
  const isDir = e.type === StorageEntryType.Dir;
  const padding = `${ props.data.level + (isDir ? 0 : 1.5) }em`;

  const rootClass = cn(classes.entry, {
    [classes.entrySelected]: isSelected
  });

  function onClick() {
    props.data.state.onSelect(id);
    props.setOpen(!props.isOpen);
  }

  return <Tooltip title={ getTooltipText(e) } arrow disableInteractive enterDelay={ 500 }>
    <span className={ rootClass } onClick={ onClick } style={ { ...props.style, paddingLeft: padding } }>
      {
          isDir && props.isOpen && <ExpandMoreIcon/>
      }

      {
          isDir && !props.isOpen && <ChevronRightIcon/>
      }

      {
        isDir
            ? <FolderIcon className={ classes.entryIcon } fontSize={ "small" }/>
            : <DescriptionIcon className={ classes.entryIcon } fontSize={ "small" }/>
      }

      <span>
        { e.path.basename }
      </span>
    </span>
  </Tooltip>;
}


function getTooltipText(e: MemoryStorageEntryPointer): React.ReactChild {
  function formatDate(date: number | undefined) {
    return date != null ? format(new Date(date), "yyyy-MMM-dd hh:mm:ss") : "?";
  }

  return <>
    <div>
      { e.path.normalized }
    </div>
    {/*<div>*/ }
    {/*  Created: { formatDate(e.storageEntry.stats()) }*/ }
    {/*</div>*/ }
    {/*<div>*/ }
    {/*  Last updated: { formatDate(e.updateTs) }*/ }
    {/*</div>*/ }
  </>;
}


const useStyles = makeStyles(theme => ({
  entry: {
    display: "flex",
    alignItems: "center",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    paddingTop: 1,
    paddingBottom: 1,
    paddingLeft: 3,
    borderRadius: 5,
    userSelect: "none",
    cursor: "default",
    height: 25
  },
  entrySelected: {
    background: theme.palette.action.selected
  },
  entryIcon: {
    marginRight: theme.spacing(1),
    color: "gray"
  },
  toolbar: {
    backgroundColor: theme.palette.background.default,
    position: "sticky",
    left: 0,
    top: 0,
    zIndex: 10
  },
  treeContainer: {
    flexGrow: 1
  },
  treeContainerPadding: {
    padding: theme.spacing(1)
  }
}));
