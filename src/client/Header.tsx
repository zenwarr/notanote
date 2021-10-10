import { observer } from "mobx-react-lite";
import { Box, Hidden, IconButton } from "@mui/material";
import makeStyles from '@mui/styles/makeStyles';
import { SyncPanel } from "./SyncPanel";
import { ProfileHeader } from "./ProfileHeader";
import MenuIcon from "@mui/icons-material/Menu";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import { PaletteMode, togglePalette } from "./PaletteProvider";
import CallToActionIcon from "@mui/icons-material/CallToAction";


export interface HeaderProps {
  onToggleDrawer?: () => void;
  isDarkTheme: boolean;
  setIsDark: (isDark: boolean) => void;
}


export const Header = observer((props: HeaderProps) => {
  const classes = useStyles();

  return (
    <Box display={ "flex" } alignItems={ "center" } justifyContent={ "space-between" }>
      <Hidden mdUp>
        <IconButton onClick={ props.onToggleDrawer } size="large">
          <MenuIcon/>
        </IconButton>
      </Hidden>

      <div className={ classes.syncPanel }>
        <SyncPanel/>
      </div>

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
    </Box>
  );
});


const useStyles = makeStyles(theme => ({
  syncPanel: {
    width: "100%"
  }
}));
