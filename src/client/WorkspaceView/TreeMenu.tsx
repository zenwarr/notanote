import { Divider, ListItemIcon, Menu, MenuItem } from "@mui/material";
import { CreateNewFolderOutlined, DeleteForever, PostAddOutlined } from "@mui/icons-material";
import * as React from "react";
import { PropertiesDialog } from "./PropertiesDialog";
import { useState } from "react";
import { StorageEntryPointer } from "../../common/storage/StorageLayer";


export interface TreeMenuProps {
  open: boolean;
  onClose: () => void;
  entry: StorageEntryPointer | undefined;
  x: number | undefined;
  y: number | undefined;
}


export function TreeMenu(props: TreeMenuProps) {
  const [ propertiesDialogOpen, setPropertiesDialogOpen ] = useState(false);

  return <React.Fragment>
    <Menu open={ props.open } onClose={ props.onClose } anchorReference={ "anchorPosition" } anchorPosition={
      props.open && props.x && props.y ? { top: props.y, left: props.x } : undefined
    }>
      <MenuItem onClick={ props.onClose }>
        <ListItemIcon>
          <PostAddOutlined/>
        </ListItemIcon>
        Create file
      </MenuItem>

      <MenuItem onClick={ props.onClose }>
        <ListItemIcon>
          <CreateNewFolderOutlined/>
        </ListItemIcon>
        Create directory
      </MenuItem>

      <Divider/>

      <MenuItem onClick={ props.onClose }>
        Rename
      </MenuItem>
      <MenuItem onClick={ props.onClose }>
        <ListItemIcon>
          <DeleteForever color={ "error" }/>
        </ListItemIcon>
        Delete
      </MenuItem>

      <Divider/>

      <MenuItem onClick={ () => {
        props.onClose();
        setPropertiesDialogOpen(true);
      } }>
        Show properties
      </MenuItem>
    </Menu>

    <PropertiesDialog open={ propertiesDialogOpen } onClose={ () => setPropertiesDialogOpen(false) } entry={ props.entry }/>
  </React.Fragment>;
}
