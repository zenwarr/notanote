import * as path from "path";
import * as React from "react";
import { useEffect, useState } from "react";
import { TreeItem, TreeView } from "@material-ui/lab";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import { WorkspaceEntry } from "../common/WorkspaceEntry";
import { Box, IconButton, makeStyles } from "@material-ui/core";
import { WorkspaceManager } from "./WorkspaceManager";
import { observer } from "mobx-react-lite";
import { CreateDirDialog } from "./CreateDirDialog";
import { CreateNewFolderOutlined, PostAddOutlined } from "@material-ui/icons";


export interface WorkspaceViewProps {

}


function getParentFromSelectedNode(selected: string | undefined): string {
  if (!selected) {
    return "";
  }

  const workspaceEntry = WorkspaceManager.instance.getEntryByPath(selected);
  if (!workspaceEntry) {
    return "";
  }

  if (workspaceEntry.type === "dir") {
    return selected;
  } else {
    return path.dirname(selected);
  }
}


export const WorkspaceView = observer((props: WorkspaceViewProps) => {
  const workspaceManager = WorkspaceManager.instance;
  const [ folderDialogOpened, setFolderDialogOpened ] = useState(false);
  const parent = getParentFromSelectedNode(workspaceManager.selectedEntryPath);
  const classes = useStyles();

  useEffect(() => { workspaceManager.load() }, []);

  function onNodeSelect(_: unknown, value: string | string[]) {
    if (typeof value === "string" || value == null) {
      workspaceManager.selectedEntryPath = value;
    }
  }

  function createFile() {
    WorkspaceManager.instance.createEntry(parent, undefined, "file");
  }

  function createFolder() {
    setFolderDialogOpened(true);
  }

  return <div>
    <CreateDirDialog open={ folderDialogOpened } onClose={ () => setFolderDialogOpened(false) } parentPath={ parent }/>

    <Box mb={ 2 } display={ "flex" } justifyContent={ "center" }>
      <IconButton onClick={ createFile } title={ "Create file" }>
        <PostAddOutlined/>
      </IconButton>

      <IconButton onClick={ createFolder } title={ "Create folder" }>
        <CreateNewFolderOutlined/>
      </IconButton>
    </Box>

    <TreeView defaultCollapseIcon={ <ExpandMoreIcon/> } defaultExpandIcon={ <ChevronRightIcon/> } onNodeSelect={ onNodeSelect }
              selected={ workspaceManager.selectedEntryPath ?? "" }>
      { workspaceManager.entries.map(e => renderTreeEntry(e, classes.entry)) }
    </TreeView>
  </div>;
});


function renderTreeEntry(e: WorkspaceEntry, className: string) {
  const label = <span title={ e.name } className={ className }>
    { e.name }
  </span>;

  return <TreeItem nodeId={ e.id } key={ e.id } label={ label }>
    { e.children && e.children.map(c => renderTreeEntry(c, className)) }
  </TreeItem>;
}


const useStyles = makeStyles(theme => ({
  entry: {
    display: "block",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  }
}));
