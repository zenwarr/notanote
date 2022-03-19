import { Box, CircularProgress, Hidden, SwipeableDrawer } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { WorkspaceView } from "./WorkspaceView";
import { ConnectedFileView } from "./FileView";
import { Header } from "./Header";
import { usePreventClose } from "./usePreventClose";
import { useEffect, useState } from "react";
import { Route, Routes, useLocation } from "react-router";
import { HashRouter } from "react-router-dom";
import { ClientWorkspace } from "./ClientWorkspace";
import "./App.css";
import { useShortcuts } from "./Shortcuts";
import { PaletteProvider } from "./PaletteProvider";
import { useAppThemeContext } from "./Theme";
import { StoragePath } from "../common/storage/StoragePath";
import { StorageEntryType } from "../common/storage/StorageLayer";
import { MemoryCachedEntryPointer } from "../common/storage/MemoryCachedStorage";
import { observer } from "mobx-react-lite";


export const App = observer(() => {
  const [ drawerOpen, setDrawerOpen ] = useState(false);
  const classes = useStyles();
  const iOS = !!(navigator.userAgent && /iPad|iPhone|iPod/.test(navigator.userAgent));
  const [ loaded, setLoaded ] = useState(false);

  usePreventClose();
  useShortcuts();
  const appTheme = useAppThemeContext();

  useEffect(() => {
    ClientWorkspace.instance.load().then(() => setLoaded(true)).catch(err => console.error(err.message));
  }, []);

  function onMobileEntrySelected(e: MemoryCachedEntryPointer) {
    if (e.memory.type === StorageEntryType.File) {
      setDrawerOpen(false);
    }
  }

  if (ClientWorkspace.instance.loading) {
    return <Box display={ "flex" } alignItems={ "center" } justifyContent={ "center" } height={ 300 }>
      <CircularProgress/>
    </Box>;
  }

  return <HashRouter>
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
                             disableBackdropTransition={ !iOS } disableDiscovery={ iOS }>
              <Box className={ classes.workspaceViewContainer }>
                <WorkspaceView treeWithPadding onEntrySelected={ onMobileEntrySelected }/>
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
  </HashRouter>;
});


export function FileViewRoute() {
  const loc = useLocation();
  const entryPath = loc.pathname.startsWith("/f/") ? loc.pathname.substring("/f".length) : undefined;

  useEffect(() => {
    ClientWorkspace.instance.selectedEntry = entryPath ? new StoragePath(entryPath) : undefined;
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
