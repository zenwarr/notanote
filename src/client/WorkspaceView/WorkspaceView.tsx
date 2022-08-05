import * as React from "react";
import { useRef, useState } from "react";
import cn from "classnames";
import { Box, IconButton } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { SerializableStorageEntryData } from "@common/workspace/SerializableStorageEntryData";
import { ClientWorkspace } from "../ClientWorkspace";
import { observer } from "mobx-react-lite";
import { CreateEntryDialog } from "../CreateEntryDialog";
import { CreateNewFolderOutlined, DeleteForever, PostAddOutlined } from "@mui/icons-material";
import { useNavigate } from "react-router";
import { StoragePath } from "@storage/StoragePath";
import { StorageEntryType } from "@storage/StorageLayer";
import { ContainerWithSizeDetection } from "../utils/ContainerWithSizeDetection";
import { TreeNode } from "./TreeNode";
import { TreeState } from "./TreeState";
import { TreeContext } from "./TreeContext";
import { TreeMenu } from "./TreeMenu";
import { TreeWrapper } from "./TreeWrapper";


export interface WorkspaceViewProps {
  onFileSelected?: (entry: StoragePath) => void;
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
    const entry = ClientWorkspace.instance.storage.getMemoryData(selectedPath);
    if (!entry) {
      parentPath = StoragePath.root;
    } else if (entry.stats.isDirectory) {
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

  function onNodeSelect(value: string) {
    const selectedEntry = ClientWorkspace.instance.storage.getMemoryData(new StoragePath(value));
    if (!selectedEntry) {
      return;
    }

    ClientWorkspace.instance.selectedEntry = new StoragePath(value);
    const isDir = selectedEntry.stats.isDirectory;

    if (!isDir) {
      navigate(`/f/${ value }`);
      props.onFileSelected?.(new StoragePath(selectedEntry.path));
    } else {
      expand.onToggle(value);
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
    root: cw.storage.memory.data,
    selected: cw.selectedEntry?.normalized || "",
    onSelect: onNodeSelect,
    expanded: expand.expanded
  };

  const containerClassName = cn(classes.treeContainer, { [classes.treeContainerPadding]: props.treeWithPadding });

  const [ menuEntry, setMenuEntry ] = useState<SerializableStorageEntryData | undefined>();
  const [ menuState, setMenuState ] = useState<{
    x: number;
    y: number
  } | undefined>();

  function onMenuOpen(x: number, y: number, path: StoragePath) {
    setMenuState({ x, y });
    setMenuEntry(ClientWorkspace.instance.storage.getMemoryData(path));
  }

  function onMenuClose() {
    setMenuState(undefined);
  }

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
            title={ "Delete selected" }
            disabled={ !cw.selectedEntry }
            size="large">
          <DeleteForever color={ "error" }/>
        </IconButton>
      </Box>
    </Box>

    <TreeContext.Provider value={ { openMenu: onMenuOpen, closeMenu: onMenuClose } }>
      <ContainerWithSizeDetection className={ containerClassName }>
        {
          (width, height) => <TreeWrapper state={ treeState } itemSize={ 25 } height={ height } width={ width }>
            { TreeNode as any }
          </TreeWrapper>
        }
      </ContainerWithSizeDetection>
    </TreeContext.Provider>

    <TreeMenu open={ menuState != null } onClose={ () => setMenuState(undefined) }
              entry={ menuEntry ? cw.storage.get(new StoragePath(menuEntry.path)) : undefined }
              x={ menuState?.x } y={ menuState?.y }/>
  </>;
});


const useStyles = makeStyles(theme => ({
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
