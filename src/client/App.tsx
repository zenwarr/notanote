import { Box, Alert, CircularProgress, Hidden, SwipeableDrawer } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { WorkspaceNavigateHelper } from "./workspace/workspace-navigate-helper";
import { WorkspaceView } from "./workspace/workspace-view";
import { ConnectedFileView } from "./editor/file-view";
import { Header } from "./Header";
import { usePreventClose } from "./usePreventClose";
import { useEffect, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router";
import { BrowserRouter, HashRouter } from "react-router-dom";
import { Workspace } from "./workspace/workspace";
import "./App.css";
import { useShortcuts } from "./Shortcuts";
import { PaletteProvider } from "./palette/palette-provider";
import { useAppThemeContext } from "./theme/theme";
import { StoragePath } from "@storage/storage-path";
import { observer } from "mobx-react-lite";


export const App = observer(() => {
  const [ drawerOpen, setDrawerOpen ] = useState(false);
  const classes = useStyles();
  const iOS = !!(navigator.userAgent && /iPad|iPhone|iPod/.test(navigator.userAgent));

  usePreventClose();
  useShortcuts();
  const appTheme = useAppThemeContext();

  useEffect(() => {
    Workspace.instance.load();
  }, []);

  function onMobileEntrySelected(path: StoragePath) {
    const cached = Workspace.instance.storage.getMemoryData(path);
    if (cached && !cached.stats.isDirectory) {
      setDrawerOpen(false);
    }
  }

  if (Workspace.instance.loading) {
    return <Box display={ "flex" } alignItems={ "center" } justifyContent={ "center" } height={ 300 }>
      <CircularProgress/>
    </Box>;
  }

  if (Workspace.instance.loadError) {
    return <Box p={ 2 }>
      <Alert severity={ "error" }>Error initialing workspace: { Workspace.instance.loadError }</Alert>
    </Box>;
  }

  return <HashRouter>
    <WorkspaceNavigateHelper />
    <LocalizationProvider dateAdapter={ AdapterDateFns }>
      <PaletteProvider>
        <div className={ classes.root }>
          <div className={ classes.workspaceView }>
            <Hidden lgDown>
              <Box p={ 2 } className={ classes.workspaceViewContainer }>
                <WorkspaceView/>
              </Box>
            </Hidden>

            <Hidden lgUp>
              <SwipeableDrawer open={ drawerOpen } onOpen={ () => setDrawerOpen(true) } onClose={ () => setDrawerOpen(false) }
                               disableBackdropTransition={ !iOS } disableDiscovery={ iOS } keepMounted>
                <Box className={ classes.workspaceViewContainer }>
                  <WorkspaceView treeWithPadding onFileSelected={ onMobileEntrySelected }/>
                </Box>
              </SwipeableDrawer>
            </Hidden>
          </div>

          <div className={ classes.docView }>
            <div className={ classes.header }>
              <Header onToggleDrawer={ () => setDrawerOpen(!drawerOpen) } isDarkTheme={ appTheme.isDark } setIsDark={ appTheme.setIsDark }/>
            </div>

            <Routes>
              <Route path={ "/f/*" } element={ <FileViewRoute/> }/>
            </Routes>

            <ConnectedFileView className={ classes.docEditor }/>
          </div>
        </div>
      </PaletteProvider>
    </LocalizationProvider>
  </HashRouter>;
});


export function FileViewRoute() {
  const loc = useLocation();
  const entryPath = loc.pathname.startsWith("/f/") ? loc.pathname.substring("/f".length) : undefined;

  useEffect(() => {
    Workspace.instance.onNavigate(entryPath ? new StoragePath(entryPath) : undefined);
  }, [ entryPath ]);

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
    [theme.breakpoints.down("lg")]: {
      display: "none"
    }
  },
  workspaceViewContainer: {
    maxWidth: "300px",
    minWidth: "300px",
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    [theme.breakpoints.down("lg")]: {
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
    [theme.breakpoints.down("lg")]: {
      paddingTop: 0
    }
  },
  docEditor: {
    height: "calc(100% - 40px)",
    width: "100%"
  },
  header: {
    marginBottom: theme.spacing(2),
    marginRight: theme.spacing(2),
    [theme.breakpoints.down("lg")]: {
      padding: theme.spacing(2),
      marginBottom: 0,
      marginRight: 0
    }
  }
}));
