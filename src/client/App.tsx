import { Box, Drawer, Hidden, makeStyles } from "@material-ui/core";
import { WorkspaceView } from "./WorkspaceView";
import { ConnectedFileView } from "./FileView";
import { Header } from "./Header";
import { usePreventClose } from "./usePreventClose";
import { useState } from "react";


export function App() {
  const [ drawerOpen, setDrawerOpen ] = useState(false);
  const classes = useStyles();

  usePreventClose();

  return <div className={ classes.root }>
    <div className={ classes.workspaceView }>
      <Hidden smDown>
        <Box p={ 2 }>
          <WorkspaceView/>
        </Box>
      </Hidden>

      <Hidden mdUp>
        <Drawer open={ drawerOpen } onClose={ () => setDrawerOpen(false) }>
          <Box p={ 2 }>
            <WorkspaceView/>
          </Box>
        </Drawer>
      </Hidden>
    </div>

    <div className={ classes.docView }>
      <div className={ classes.syncPanel }>
        <Header onToggleDrawer={ () => setDrawerOpen(!drawerOpen) }/>
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
    paddingRight: theme.spacing(2),
    [theme.breakpoints.down("sm")]: {
      display: "none"
    }
  },
  docView: {
    width: "100%",
    position: "relative",
    paddingTop: 20,
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(2)
    }
  },
  syncPanel: {
    marginBottom: theme.spacing(2),
    marginRight: theme.spacing(2)
  }
}));
