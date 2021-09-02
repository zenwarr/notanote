import { IconButton, makeStyles, Menu, MenuItem } from "@material-ui/core";
import { ProfileManager } from "./ProfileManager";
import { AccountCircle } from "@material-ui/icons";
import { useState } from "react";


export function ProfileHeader() {
  const classes = useStyles();
  const [ menuAnchor, setMenuAnchor ] = useState<HTMLElement | undefined>(undefined);

  return <>
    <IconButton title={ ProfileManager.instance.userName }
                onClick={ e => setMenuAnchor(e.currentTarget) }>
      <AccountCircle/>
    </IconButton>

    <Menu open={ menuAnchor != null } onClose={ () => setMenuAnchor(undefined) } anchorEl={ menuAnchor || null }
          getContentAnchorEl={ null }
          anchorOrigin={ { vertical: "bottom", horizontal: "left" } }
    >
      <div className={ classes.profileName }>
        { ProfileManager.instance.userName }
      </div>
    </Menu>
  </>;
}


const useStyles = makeStyles(theme => ({
  profileName: {
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(2),
    userSelect: "none"
  }
}));
