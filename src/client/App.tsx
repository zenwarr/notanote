import { Box, Hidden, makeStyles, SwipeableDrawer } from "@material-ui/core";
import { WorkspaceView } from "./WorkspaceView";
import { ConnectedFileView } from "./FileView";
import { Header } from "./Header";
import { usePreventClose } from "./usePreventClose";
import { useEffect, useState } from "react";
import { Route, Switch, useParams } from "react-router";
import { HashRouter } from "react-router-dom";
import { WorkspaceManager } from "./WorkspaceManager";
import { WorkspaceEntry } from "../common/WorkspaceEntry";
import "./App.css";


export function App() {
  const [ drawerOpen, setDrawerOpen ] = useState(false);
  const classes = useStyles();
  const iOS = !!(navigator.userAgent && /iPad|iPhone|iPod/.test(navigator.userAgent));

  usePreventClose();

  useEffect(() => {
    WorkspaceManager.instance.load();
  }, []);

  function onMobileEntrySelected(e: WorkspaceEntry) {
    if (e.type === "file") {
      setDrawerOpen(false);
    }
  }

  return <HashRouter>
    <div className={ classes.root }>
      <div className={ classes.workspaceView }>
        <Hidden smDown>
          <Box p={ 2 } className={ classes.workspaceViewContainer }>
            <WorkspaceView/>
          </Box>
        </Hidden>

        <Hidden mdUp>
          <SwipeableDrawer open={ drawerOpen } onOpen={ () => setDrawerOpen(true) } onClose={ () => setDrawerOpen(false) }
                           disableBackdropTransition={ !iOS } disableDiscovery={ iOS }>
            <Box p={ 2 } className={ classes.workspaceViewContainer }>
              <WorkspaceView onEntrySelected={ onMobileEntrySelected }/>
            </Box>
          </SwipeableDrawer>
        </Hidden>
      </div>

      <div className={ classes.docView }>
        <div className={ classes.syncPanel }>
          <Header onToggleDrawer={ () => setDrawerOpen(!drawerOpen) }/>
        </div>

        <Switch>
          <Route exact key={ "file" } path={ "/f/:segment+" } component={ FileViewRoute }/>
        </Switch>

        <ConnectedFileView className={ classes.docEditor }/>
      </div>
    </div>
  </HashRouter>;
}


export function FileViewRoute() {
  const params = useParams<{ segment: string }>();

  useEffect(() => {
    WorkspaceManager.instance.selectedEntryPath = params.segment;
  }, [ params.segment ]);

  return null;
}


const useStyles = makeStyles(theme => ({
  root: {
    display: "flex",
    alignItems: "stretch",
    height: "100vh",
    overflow: "hidden"
  },
  workspaceView: {
    position: "sticky",
    top: 0,
    left: 0,
    paddingRight: theme.spacing(2),
    [theme.breakpoints.down("sm")]: {
      display: "none"
    }
  },
  workspaceViewContainer: {
    maxWidth: "300px",
    minWidth: "300px",
    [theme.breakpoints.down("sm")]: {
      width: 500,
      maxWidth: "90vw"
    }
  },
  docView: {
    width: "100%",
    position: "relative",
    paddingTop: 20,
    display: "flex",
    flexDirection: "column",
    marginBottom: theme.spacing(3),
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(2)
    }
  },
  docEditor: {
    height: "calc(100% - 40px)",
    paddingRight: theme.spacing(5),
    maxWidth: 900
  },
  syncPanel: {
    marginBottom: theme.spacing(2),
    marginRight: theme.spacing(2)
  }
}));
