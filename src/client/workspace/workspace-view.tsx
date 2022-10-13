import { CreateNewFolderOutlined, DeleteForever, PostAddOutlined } from "@mui/icons-material";
import { Alert, Box, CircularProgress, IconButton } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { StorageEntryType } from "@storage/entry-storage";
import { StoragePath } from "@storage/storage-path";
import cn from "classnames";
import { observer } from "mobx-react-lite";
import * as React from "react";
import { useRef, useState } from "react";
import { Workspace } from "./workspace";
import { CreateEntryDialog } from "../CreateEntryDialog";
import { ContainerWithSizeDetection } from "../utils/ContainerWithSizeDetection";
import { WorkspaceTreeMenu } from "./workspace-tree-menu";
import { WorkspaceTree } from "./workspace-tree";


export interface WorkspaceViewProps {
  onFileSelected?: (entry: StoragePath) => void;
  treeWithPadding?: boolean;
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
    const entry = Workspace.instance.storage.getMemoryData(selectedPath);
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
  const cw = Workspace.instance;
  const [ entryDialogOpened, setEntryDialogOpened ] = useState(false);
  const createOptions = useRef<CreateOptions | undefined>(undefined);

  const classes = useStyles();

  function onSelect(path: StoragePath) {
    cw.onEntrySelect(path);
    props.onFileSelected?.(path);
  }

  function createFile() {
    createOptions.current = getCreateOptions(cw.treeSelectedPath, StorageEntryType.File);
    setEntryDialogOpened(true);
  }

  function createFolder() {
    createOptions.current = getCreateOptions(cw.treeSelectedPath, StorageEntryType.Dir);
    setEntryDialogOpened(true);
  }

  function onCreateDialogClose() {
    createOptions.current = undefined;
    setEntryDialogOpened(false);
  }

  async function remove() {
    if (!cw.treeSelectedPath || !confirm("Are you sure you want to remove it?\n\n" + cw.treeSelectedPath)) {
      return;
    }

    await Workspace.instance.remove(cw.treeSelectedPath);
  }

  const containerClassName = cn(classes.treeContainer, { [classes.treeContainerPadding]: props.treeWithPadding });

  const [ menuEntryPath, setMenuEntryPath ] = useState<StoragePath | undefined>();
  const [ menuState, setMenuState ] = useState<{
    x: number;
    y: number
  } | undefined>();

  function onMenuOpen(x: number, y: number, path: StoragePath) {
    setMenuState({ x, y });
    setMenuEntryPath(path);
  }

  function onMenuClose() {
    setMenuState(undefined);
  }

  if (cw.storage.memoryInitError) {
    return <Box p={ 2 }>
      <Alert severity={ "error" }>Error initialing storage: { cw.storage.memoryInitError }</Alert>
    </Box>;
  }

  if (!cw.storage.memoryInited) {
    return <Box display={ "flex" } alignItems={ "center" } justifyContent={ "center" } height={ 300 }>
      <CircularProgress/>
    </Box>;
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
            disabled={ !cw.openedPath }
            size="large">
          <DeleteForever color={ "error" }/>
        </IconButton>
      </Box>
    </Box>

    <ContainerWithSizeDetection className={ containerClassName }>
      {
        (width, height) => <WorkspaceTree height={ height } width={ width }
                                          onMenuOpen={ onMenuOpen }
                                          onSelect={ onSelect }
                                          onMenuClose={ onMenuClose }/>
      }
    </ContainerWithSizeDetection>

    <WorkspaceTreeMenu open={ menuState != null } onClose={ () => setMenuState(undefined) }
                       entry={ menuEntryPath ? cw.storage.get(menuEntryPath) : undefined }
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
