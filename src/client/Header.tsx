import { observer } from "mobx-react-lite";
import { Box, makeStyles } from "@material-ui/core";
import { SyncPanel } from "./SyncPanel";
import { ProfileHeader } from "./ProfileHeader";


export const Header = observer(() => {
  const classes = useStyles();

  return <Box display={ "flex" } alignItems={ "center" } justifyContent={ "space-between" }>
    <div className={ classes.syncPanel }>
      <SyncPanel/>
    </div>

    <ProfileHeader />
  </Box>;
});


const useStyles = makeStyles(theme => ({
  syncPanel: {
    width: "100%"
  }
}));
