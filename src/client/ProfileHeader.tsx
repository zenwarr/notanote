import { IconButton, Menu, MenuItem } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { clearData } from "./clear-data/ClearData";
import { ProfileManager } from "./ProfileManager";
import { AccountCircle } from "@mui/icons-material";
import { useState } from "react";


export function ProfileHeader() {
  const classes = useStyles();
  const [ menuAnchor, setMenuAnchor ] = useState<HTMLElement | undefined>(undefined);

  return <>
    <IconButton
        title={ ProfileManager.instance.userName }
        onClick={ e => setMenuAnchor(e.currentTarget) }
        size="large">
      <AccountCircle/>
    </IconButton>

    <Menu open={ menuAnchor != null } onClose={ () => setMenuAnchor(undefined) } anchorEl={ menuAnchor || null }
          anchorOrigin={ { vertical: "bottom", horizontal: "left" } }>
      <MenuItem onClick={ () => {
        setMenuAnchor(undefined);
        clearData();
      } }>
        Clear all data
      </MenuItem>

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
