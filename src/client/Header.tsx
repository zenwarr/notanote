import { observer } from "mobx-react-lite";
import { Box, Hidden, IconButton } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { useState } from "react";
import { SyncDialog } from "./sync/SyncDialog";
import { SyncStatus } from "./sync/SyncStatus";
import { ProfileHeader } from "./ProfileHeader";
import MenuIcon from "@mui/icons-material/Menu";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import { PaletteMode, togglePalette } from "./PaletteProvider";
import CallToActionIcon from "@mui/icons-material/CallToAction";
import { CommandStatus } from "./commands/CommandStatus";


export interface HeaderProps {
  onToggleDrawer?: () => void;
  isDarkTheme: boolean;
  setIsDark: (isDark: boolean) => void;
}


export const Header = observer((props: HeaderProps) => {
  const classes = useStyles();
  const [ syncOpen, setSyncOpen ] = useState(false);

  return (
      <Box display={ "flex" } alignItems={ "center" } justifyContent={ "space-between" }>
        <Hidden lgUp>
          <IconButton onClick={ props.onToggleDrawer } size="large">
            <MenuIcon/>
          </IconButton>
        </Hidden>

        <div className={ classes.syncPanel }>
          <SyncStatus onClick={ () => setSyncOpen(true) }/>
        </div>

        <Box mr={ 1 }>
          <CommandStatus/>
        </Box>

        <IconButton
            onClick={ () => togglePalette(PaletteMode.File) }
            title={ "Show file palette (Ctrl+P)" }
            size="large">
          <CallToActionIcon/>
        </IconButton>

        <IconButton
            onClick={ () => props.setIsDark(!props.isDarkTheme) }
            title={ props.isDarkTheme ? "Turn off dark theme" : "Turn on dark theme" }
            size="large">
          {
            props.isDarkTheme ? <Brightness4Icon/> : <Brightness7Icon/>
          }
        </IconButton>

        <ProfileHeader/>

        <SyncDialog open={ syncOpen } onClose={ () => setSyncOpen(false) }/>
      </Box>
  );
});


const useStyles = makeStyles(theme => ({
  syncPanel: {
    width: "100%"
  }
}));
