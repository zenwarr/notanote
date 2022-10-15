import { IconButton, Menu, MenuItem } from "@mui/material";
import { AccountCircle } from "@mui/icons-material";
import { useState } from "react";


export function ProfileHeader() {
  const [ menuAnchor, setMenuAnchor ] = useState<HTMLElement | undefined>(undefined);

  return <>
    <IconButton
        onClick={ e => setMenuAnchor(e.currentTarget) }
        size="large">
      <AccountCircle/>
    </IconButton>

    <Menu open={ menuAnchor != null } onClose={ () => setMenuAnchor(undefined) } anchorEl={ menuAnchor || null }
          anchorOrigin={ { vertical: "bottom", horizontal: "left" } }>
      <MenuItem onClick={ () => {
        alert("Not implemented");
      } }>
        Settings
      </MenuItem>
    </Menu>
  </>;
}
