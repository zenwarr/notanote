import { Box, makeStyles } from "@material-ui/core";
import { ProfileManager } from "./ProfileManager";
import { AccountCircle } from "@material-ui/icons";


export function ProfileHeader() {
  const classes = useStyles();

  return <Box display={ "flex" } alignItems={ "center" }>
    <span className={ classes.profileName }>
      { ProfileManager.instance.userName }
    </span>

    <AccountCircle/>
  </Box>;
}


const useStyles = makeStyles(theme => ({
  profileName: {
    marginRight: theme.spacing(1),
    whiteSpace: "nowrap"
  }
}));
