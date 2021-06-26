import * as path from "path";
import * as React from "react";
import { useEffect, useState, useRef } from "react";
import { TreeItem, TreeView } from "@material-ui/lab";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import { WorkspaceEntry } from "../common/WorkspaceEntry";
import { Box, IconButton, makeStyles } from "@material-ui/core";
import { WorkspaceManager } from "./WorkspaceManager";
import { observer } from "mobx-react-lite";
import { CreateEntryDialog } from "./CreateEntryDialog";
import { CreateNewFolderOutlined, PostAddOutlined } from "@material-ui/icons";
import { EntryType } from "../common/WorkspaceEntry";
import { useHistory } from "react-router";


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
  const [ entryDialogOpened, setEntryDialogOpened ] = useState(false);
  const createEntryType = useRef<EntryType | undefined>(undefined);
  const parent = getParentFromSelectedNode(workspaceManager.selectedEntryPath);
  const history = useHistory();
  const classes = useStyles();

  function onNodeSelect(_: unknown, value: string | string[]) {
    if (typeof value === "string" || value == null) {
      const selectedEntry = WorkspaceManager.instance.getEntryByPath(value);
      if (selectedEntry && selectedEntry.type !== "dir") {
        history.push(`/f/${ value }`);
      }
    }
  }

  function createFile() {
    createEntryType.current = "file";
    setEntryDialogOpened(true);
  }

  function createFolder() {
    createEntryType.current = "dir";
    setEntryDialogOpened(true);
  }

  return <div>
    <CreateEntryDialog open={ entryDialogOpened }
                       onClose={ () => setEntryDialogOpened(false) }
                       type={ createEntryType.current! }
                       parentPath={ parent }/>

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
