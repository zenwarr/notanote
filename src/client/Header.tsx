import { observer } from "mobx-react-lite";
import { Box, Hidden, IconButton, makeStyles } from "@material-ui/core";
import { SyncPanel } from "./SyncPanel";
import { ProfileHeader } from "./ProfileHeader";
import MenuIcon from "@material-ui/icons/Menu";


export interface HeaderProps {
  onToggleDrawer?: () => void;
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

    <ProfileHeader/>
  </Box>;
});


const useStyles = makeStyles(theme => ({
  syncPanel: {
    width: "100%"
  }
}));
