import { Box, makeStyles } from "@material-ui/core";
import { WorkspaceView } from "./WorkspaceView";
import { ConnectedFileView } from "./FileView";
import { SyncPanel } from "./SyncPanel";


export function App() {
  const classes = useStyles();

  return <div className={ classes.root }>
    <div className={ classes.workspaceView }>
      <Box p={ 2 }>
        <WorkspaceView/>
      </Box>
    </div>

    <div className={ classes.docView }>
      <div className={ classes.syncPanel }>
        <SyncPanel/>
      </div>

      <ConnectedFileView/>
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
