import { observer } from "mobx-react-lite";
import { Box, Hidden, IconButton, makeStyles } from "@material-ui/core";
import { SyncPanel } from "./SyncPanel";
import { ProfileHeader } from "./ProfileHeader";
import MenuIcon from "@material-ui/icons/Menu";
import Brightness4Icon from "@material-ui/icons/Brightness4";
import Brightness7Icon from "@material-ui/icons/Brightness7";
import { toggleFilePicker } from "./FilePicker";
import CallToActionIcon from "@material-ui/icons/CallToAction";


export interface HeaderProps {
  onToggleDrawer?: () => void;
  isDarkTheme: boolean;
  setIsDark: (isDark: boolean) => void;
}


export const Header = observer((props: HeaderProps) => {
  const classes = useStyles();

  return <Box display={ "flex" } alignItems={ "center" } justifyContent={ "space-between" }>
    <Hidden mdUp>
      <IconButton onClick={ props.onToggleDrawer }>
        <MenuIcon/>
      </IconButton>
    </Hidden>

    <div className={ classes.syncPanel }>
      <SyncPanel/>
    </div>

    <IconButton onClick={ toggleFilePicker } title={ "Show file palette (Ctrl+P)" }>
      <CallToActionIcon/>
    </IconButton>

    <IconButton onClick={ () => props.setIsDark(!props.isDarkTheme) }
                title={ props.isDarkTheme ? "Turn off dark theme" : "Turn on dark theme" }>
      {
        props.isDarkTheme ? <Brightness4Icon/> : <Brightness7Icon/>
      }
    </IconButton>

    <ProfileHeader/>
  </Box>;
});


const useStyles = makeStyles(theme => ({
  syncPanel: {
    width: "100%"
  }
}));
