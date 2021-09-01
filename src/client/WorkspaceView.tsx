import * as path from "path";
import * as React from "react";
import { useEffect, useState, useRef } from "react";
import { TreeItem, TreeView } from "@material-ui/lab";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import { WorkspaceEntry } from "../common/WorkspaceEntry";
import { Box, IconButton, makeStyles, Menu } from "@material-ui/core";
import { WorkspaceManager } from "./WorkspaceManager";
import { observer } from "mobx-react-lite";
import { CreateEntryDialog } from "./CreateEntryDialog";
import { CreateNewFolderOutlined, DeleteForever, LocalHospital, PostAddOutlined } from "@material-ui/icons";
import { EntryType } from "../common/WorkspaceEntry";
import { useHistory } from "react-router";
import DescriptionIcon from "@material-ui/icons/Description";
import FolderIcon from "@material-ui/icons/Folder";
import { WorkspaceBackend } from "./backend/WorkspaceBackend";
import { Backend } from "./backend/Backend";


export interface WorkspaceViewProps {
  onEntrySelected?: (entry: WorkspaceEntry) => void;
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

  useEffect(() => {
    if (selected && !expanded.includes(selected)) {
      setExpanded([ ...expanded, ...getParents(selected) ]);
    }
  }, [ selected ]);

  function toggleNode(input: string[], node: string) {
    if (input.includes(node)) {
      return input.filter(x => x !== node);
    } else {
      return [ ...input, node ];
    }
  }

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
  const expand = useExpanded(workspaceManager.selectedEntryPath);
  const [ selectedItem, setSelectedItem ] = useState<string | undefined>(workspaceManager.selectedEntryPath);

  const createOptions = useRef<CreateOptions | undefined>(undefined);

  const history = useHistory();
  const classes = useStyles();

  function onNodeSelect(_: unknown, value: string | string[]) {
    if (typeof value === "string" || value == null) {
      setSelectedItem(value);

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
    createOptions.current = getCreateOptions(selectedItem, "file");
    setEntryDialogOpened(true);
  }

  function createFolder() {
    createOptions.current = getCreateOptions(selectedItem, "dir");
    setEntryDialogOpened(true);
  }

  function onCreateDialogClose() {
    createOptions.current = undefined;
    setEntryDialogOpened(false);
  }

  async function remove() {
    if (!selectedItem || !confirm("Are you sure you want to remove it?\n\n" + selectedItem)) {
      return;
    }

    await WorkspaceManager.instance.remove(selectedItem);
  }

  const labelClasses = {
    label: classes.entry,
    icon: classes.entryIcon,
    text: classes.entryText
  };

  return <div>
    { createOptions.current && <CreateEntryDialog open={ entryDialogOpened }
                                                  onClose={ onCreateDialogClose }
                                                  type={ createOptions.current.type }
                                                  suggestedName={ createOptions.current.suggestedName }
                                                  parentPath={ createOptions.current.parentPath }/> }

    <Box mb={ 2 } display={ "flex" } justifyContent={ "space-between" }>
      <Box>
        <IconButton onClick={ createFile } title={ "Create file" }>
          <PostAddOutlined/>
        </IconButton>

        <IconButton onClick={ createFolder } title={ "Create folder" }>
          <CreateNewFolderOutlined/>
        </IconButton>
      </Box>

      <Box>
        <IconButton onClick={ remove } title={ "Remove selected" } disabled={ !selectedItem }>
          <DeleteForever color={ "secondary" }/>
        </IconButton>
      </Box>
    </Box>

    <TreeView defaultCollapseIcon={ <ExpandMoreIcon/> } defaultExpandIcon={ <ChevronRightIcon/> } onNodeSelect={ onNodeSelect }
              expanded={ expand.expanded } onNodeToggle={ expand.onToggle }
              selected={ selectedItem || "" }>
      { workspaceManager.entries.map(e => renderTreeEntry(e, labelClasses)) }
    </TreeView>
  </div>;
});


function renderTreeEntry(e: WorkspaceEntry, classes: { [name: string]: string }) {
  const label = <span title={ e.name } className={ classes.label }>
    { e.type === "dir"
        ? <FolderIcon className={ classes.icon } fontSize={ "small" }/>
        : <DescriptionIcon className={ classes.icon } fontSize={ "small" }/> }
    <span className={ classes.text }>
      { e.name }
    </span>
  </span>;

  return <TreeItem nodeId={ e.id } key={ e.id } label={ label }>
    { e.children && e.children.map(c => renderTreeEntry(c, classes)) }
  </TreeItem>;
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
  entryText: {}
}));
