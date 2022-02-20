import * as React from "react";
import { useRef, useState } from "react";
import { TreeItem, TreeView } from "@mui/lab";
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


export interface WorkspaceViewProps {
  onEntrySelected?: (entry: MemoryCachedEntryPointer) => void;
  treeWithPadding?: boolean;
}


function getParents(p: string) {
  const parts = p.split("/").filter(x => !!x);
  const result: string[] = [];
  for (let q = 0; q < parts.length; ++q) {
    result.push(parts.slice(0, q + 1).join("/"));
  }
  return result;
}


function useExpanded(selected: string | undefined) {
  const [ expanded, setExpanded ] = useState<string[]>(selected ? [ ...getParents(selected) ] : []);

  return {
    expanded,
    onToggle: (_: unknown, nodes: string[]) => {
      setExpanded(nodes);
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

  function onNodeSelect(_: unknown, value: string | string[]) {
    if (typeof value === "string" || value == null) {
      ClientWorkspace.instance.selectedEntry = new StoragePath(value);

      const selectedEntry = ClientWorkspace.instance.storage.get(new StoragePath(value));
      if (selectedEntry && selectedEntry.memory.type !== StorageEntryType.Dir) {
        navigate(`/f/${ value }`);
      }

      if (selectedEntry) {
        props.onEntrySelected?.(selectedEntry);
      }
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

  const labelClasses = {
    label: classes.entry,
    icon: classes.entryIcon,
    text: classes.entryText
  };

  return (
      <div className={ classes.container }>
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

        <Box p={ props.treeWithPadding ? 1 : undefined }>
          <TreeView defaultCollapseIcon={ <ExpandMoreIcon/> } defaultExpandIcon={ <ChevronRightIcon/> } onNodeSelect={ onNodeSelect }
                    expanded={ expand.expanded } onNodeToggle={ expand.onToggle }
                    selected={ cw.selectedEntry?.normalized || "" }>
            { cw.storage.memory.root.directChildren?.map(e => renderTreeEntry(e, labelClasses)) }
          </TreeView>
        </Box>
      </div>
  );
});


function renderTreeEntry(e: MemoryStorageEntryPointer, classes: { [name: string]: string }) {
  const label = <Tooltip title={ getTooltipText(e) } arrow disableInteractive enterDelay={ 500 }>
    <span className={ classes.label }>
      { e.type === StorageEntryType.Dir
          ? <FolderIcon className={ classes.icon } fontSize={ "small" }/>
          : <DescriptionIcon className={ classes.icon } fontSize={ "small" }/> }
      <span className={ classes.text }>
        { e.path.basename }
      </span>
    </span>
  </Tooltip>;

  const entryPath = e.path.normalized;
  return <TreeItem nodeId={ entryPath } key={ entryPath } label={ label }>
    { e.directChildren && e.directChildren.map(c => renderTreeEntry(c, classes)) }
  </TreeItem>;
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
    borderRadius: 5
  },
  entryIcon: {
    marginRight: theme.spacing(1),
    color: "gray"
  },
  entryText: {},
  toolbar: {
    backgroundColor: theme.palette.background.default,
    position: "sticky",
    left: 0,
    top: 0,
    zIndex: 10
  },
  container: {
    overflow: "auto",
    height: "100vh",
    position: "relative"
  }
}));
