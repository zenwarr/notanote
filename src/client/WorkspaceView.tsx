import * as path from "path";
import * as React from "react";
import { useRef, useState } from "react";
import { TreeItem, TreeView } from "@mui/lab";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { EntryType, WorkspaceEntry } from "../common/WorkspaceEntry";
import { Box, IconButton, Tooltip } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { WorkspaceManager } from "./WorkspaceManager";
import { observer } from "mobx-react-lite";
import { CreateEntryDialog } from "./CreateEntryDialog";
import { CreateNewFolderOutlined, DeleteForever, PostAddOutlined } from "@mui/icons-material";
import { useHistory } from "react-router";
import DescriptionIcon from "@mui/icons-material/Description";
import FolderIcon from "@mui/icons-material/Folder";
import { format, formatRelative } from "date-fns";


export interface WorkspaceViewProps {
  onEntrySelected?: (entry: WorkspaceEntry) => void;
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
  parentPath: string;
  suggestedName: string;
  type: EntryType;
}


function getCreateOptions(selected: string | undefined, createType: EntryType) {
  let parentPath: string;

  if (!selected) {
    parentPath = "/";
  } else {
    const workspaceEntry = WorkspaceManager.instance.getEntryByPath(selected);
    if (!workspaceEntry) {
      parentPath = "/";
    } else if (workspaceEntry.type === "dir") {
      parentPath = selected;
    } else {
      parentPath = path.dirname(selected);
    }
  }

  let suggestedName = createType === "dir" ? "new-dir" : "new-file.md";

  return {
    type: createType,
    parentPath,
    suggestedName
  };
}


export const WorkspaceView = observer((props: WorkspaceViewProps) => {
  const workspaceManager = WorkspaceManager.instance;
  const [ entryDialogOpened, setEntryDialogOpened ] = useState(false);
  const expand = useExpanded(workspaceManager.selectedEntry);
  const createOptions = useRef<CreateOptions | undefined>(undefined);

  const history = useHistory();
  const classes = useStyles();

  function onNodeSelect(_: unknown, value: string | string[]) {
    if (typeof value === "string" || value == null) {
      WorkspaceManager.instance.selectedEntry = value;

      const selectedEntry = WorkspaceManager.instance.getEntryByPath(value);
      if (selectedEntry && selectedEntry.type !== "dir") {
        history.push(`/f/${ value }`);
      }

      if (selectedEntry) {
        props.onEntrySelected?.(selectedEntry);
      }
    }
  }

  function createFile() {
    createOptions.current = getCreateOptions(workspaceManager.selectedEntry, "file");
    setEntryDialogOpened(true);
  }

  function createFolder() {
    createOptions.current = getCreateOptions(workspaceManager.selectedEntry, "dir");
    setEntryDialogOpened(true);
  }

  function onCreateDialogClose() {
    createOptions.current = undefined;
    setEntryDialogOpened(false);
  }

  async function remove() {
    if (!workspaceManager.selectedEntry || !confirm("Are you sure you want to remove it?\n\n" + workspaceManager.selectedEntry)) {
      return;
    }

    await WorkspaceManager.instance.remove(workspaceManager.selectedEntry);
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
                disabled={ !workspaceManager.selectedEntry }
                size="large">
              <DeleteForever color={ "error" }/>
            </IconButton>
          </Box>
        </Box>

        <Box p={ props.treeWithPadding ? 1 : undefined }>
          <TreeView defaultCollapseIcon={ <ExpandMoreIcon/> } defaultExpandIcon={ <ChevronRightIcon/> } onNodeSelect={ onNodeSelect }
                    expanded={ expand.expanded } onNodeToggle={ expand.onToggle }
                    selected={ workspaceManager.selectedEntry || "" }>
            { workspaceManager.entries.map(e => renderTreeEntry(e, labelClasses)) }
          </TreeView>
        </Box>
      </div>
  );
});


function renderTreeEntry(e: WorkspaceEntry, classes: { [name: string]: string }) {
  const label = <Tooltip title={ getTooltipText(e) }>
    <span className={ classes.label }>
      { e.type === "dir"
          ? <FolderIcon className={ classes.icon } fontSize={ "small" }/>
          : <DescriptionIcon className={ classes.icon } fontSize={ "small" }/> }
      <span className={ classes.text }>
        { e.name }
      </span>
    </span>
  </Tooltip>;

  return <TreeItem nodeId={ e.id } key={ e.id } label={ label }>
    { e.children && e.children.map(c => renderTreeEntry(c, classes)) }
  </TreeItem>;
}


function getTooltipText(e: WorkspaceEntry): React.ReactChild {
  function formatDate(date: number | undefined) {
    return date != null ? format(new Date(date), "yyyy-MM-dd hh:mm:ss") : "?";
  }

  return <>
    <div>
      { e.name }
    </div>
    <div>
      Created: { formatDate(e.createTs) }
    </div>
    <div>
      Last updated: { formatDate(e.updateTs) }
    </div>
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
