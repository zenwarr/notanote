import { useState } from "react";
import { Box, Grid } from "@material-ui/core";
import { WorkspaceView } from "./WorkspaceView";
import { FileView } from "./FileView";
import { SyncPanel } from "./SyncPanel";
import { DocumentManager } from "./DocumentManager";


export function App() {
  const [ selectedFileID, setSelectedFileID ] = useState<string | undefined>();
  const selectedDoc = selectedFileID != null ? DocumentManager.instance.documents.get(selectedFileID)?.doc : undefined;

  return <Grid container>
    <Grid item md={ 3 }>
      <Box p={ 2 }>
        <WorkspaceView onFileSelected={ setSelectedFileID }/>
      </Box>
    </Grid>

    <Grid item md={ 9 }>
      <Box position={ "absolute" } right={ 20 } top={ 5 }>
        <SyncPanel currentDoc={ selectedDoc }/>
      </Box>

      <Box p={ 2 }>
        { selectedFileID && <FileView fileID={ selectedFileID }/> }
      </Box>
    </Grid>
  </Grid>;
}
