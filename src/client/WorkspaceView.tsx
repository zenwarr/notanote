import * as path from "path";
import { useLoad } from "./useLoad";
import { TreeItem, TreeView } from "@material-ui/lab";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import { WorkspaceEntry } from "../common/WorkspaceEntry";
import { Box, Button } from "@material-ui/core";
import { useCallback, useState } from "react";
import { WorkspaceManager } from "./WorkspaceManager";


export interface WorkspaceViewProps {
  onFileSelected?: (fileID: string | undefined) => void;
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


export function WorkspaceView(props: WorkspaceViewProps) {
  const entriesLoad = useLoad(useCallback(() => WorkspaceManager.instance.load(), []));
  const [ selectedNode, setSelectedNode ] = useState<string | undefined>(undefined);

  function onNodeSelect(_: unknown, value: string | string[]) {
    if (typeof value === "string" || value == null) {
      setSelectedNode(value);

      const entry = WorkspaceManager.instance.getEntryByPath(value);
      if (entry && entry.type === "file") {
        props.onFileSelected?.(value);
      }
    }
  }

  function createFile() {
    const parent = getParentFromSelectedNode(selectedNode);
    WorkspaceManager.instance.createEntry(path.join(parent, "new-file.md"), "file");
  }

  function createFolder() {
    const parent = getParentFromSelectedNode(selectedNode);
    WorkspaceManager.instance.createEntry(path.join(parent, "new-dir"), "dir");
  }

  if (!entriesLoad.isLoaded) {
    return <div>
      loading...
    </div>;
  }

  return <div>
    <Box mb={ 2 } display={ "flex" } justifyContent={ "center" }>
      <Button onClick={ createFile }>
        + File
      </Button>

      <Button onClick={ createFolder }>
        + Folder
      </Button>
    </Box>

    <TreeView defaultCollapseIcon={ <ExpandMoreIcon/> } defaultExpandIcon={ <ChevronRightIcon/> } onNodeSelect={ onNodeSelect }
              selected={ selectedNode ?? "" }>
      { entriesLoad.data.map(e => renderTreeEntry(e)) }
    </TreeView>
  </div>;
}

function renderTreeEntry(e: WorkspaceEntry) {
  return <TreeItem nodeId={ e.id } key={ e.id } label={ e.name }>
    { e.children && e.children.map(c => renderTreeEntry(c)) }
  </TreeItem>;
}
