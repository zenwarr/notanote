import { useState } from "react";
import { Box, Grid, makeStyles } from "@material-ui/core";
import { WorkspaceView } from "./WorkspaceView";
import { FileView } from "./FileView";
import { SyncPanel } from "./SyncPanel";
import { DocumentManager } from "./DocumentManager";


export function App() {
  const [ selectedFileID, setSelectedFileID ] = useState<string | undefined>();
  const selectedDoc = selectedFileID != null ? DocumentManager.instance.documents.get(selectedFileID)?.doc : undefined;
  const classes = useStyles();

  return <div className={ classes.root }>
    <div className={ classes.workspaceView }>
      <Box p={ 2 }>
        <WorkspaceView onFileSelected={ setSelectedFileID }/>
      </Box>
    </div>

    <div className={ classes.docView }>
      <div className={ classes.syncPanel }>
        <SyncPanel currentDoc={ selectedDoc }/>
      </div>

      { selectedFileID && <FileView fileID={ selectedFileID }/> }
    </div>
  </div>;
}


const useStyles = makeStyles(theme => ({
  root: {
    display: "flex",
    alignItems: "stretch",
    height: "100vh",
    overflow: "scroll"
  },
  workspaceView: {
    maxWidth: "300px",
    minWidth: "300px",
    position: "sticky",
    top: 0,
    left: 0,
    paddingRight: theme.spacing(2)
  },
  docView: {
    width: "100%",
    position: "relative",
    paddingTop: 20
  },
  syncPanel: {
    position: "absolute",
    left: 0,
    top: 10
  }
}));
