import { StorageEntryType } from "../../common/storage/StorageLayer";
import cn from "classnames";
import * as React from "react";
import { useState } from "react";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import FolderIcon from "@mui/icons-material/Folder";
import DescriptionIcon from "@mui/icons-material/Description";
import { makeStyles } from "@mui/styles";
import { TreeNodeData } from "./TreeState";
import { useTreeContext } from "./TreeContext";


interface TreeNodeProps {
  data: TreeNodeData;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  style: any;
}


export function TreeNode(props: TreeNodeProps) {
  const e = props.data.entry;
  const classes = useStyles();
  const treeCtx = useTreeContext();

  const id = props.data.entry.path.normalized;
  const isSelected = props.data.state.selected === id;
  const isDir = e.type === StorageEntryType.Dir;
  const padding = `${ props.data.level + (isDir ? 0 : 1.5) }em`;

  const rootClass = cn(classes.entry, {
    [classes.entrySelected]: isSelected
  });

  function onClick() {
    if (isDir) {
      props.setOpen(!props.isOpen);
    }
    props.data.state.onSelect(id);
  }

  function onContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    treeCtx.openMenu(e.clientX - 2, e.clientY - 4, props.data.entry);
  }

  return <span className={ rootClass } onClick={ onClick } style={ { ...props.style, paddingLeft: padding } }
               onContextMenu={ onContextMenu }>
    {
        isDir && props.isOpen && <ExpandMoreIcon/>
    }

    {
        isDir && !props.isOpen && <ChevronRightIcon/>
    }

    {
      isDir
          ? <FolderIcon className={ classes.entryIcon } fontSize={ "small" }/>
          : <DescriptionIcon className={ classes.entryIcon } fontSize={ "small" }/>
    }

    <span>
      { e.path.basename }
    </span>
  </span>;
}


const useStyles = makeStyles(theme => ({
  entry: {
    display: "flex",
    alignItems: "center",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    paddingTop: 1,
    paddingBottom: 1,
    paddingLeft: 3,
    borderRadius: 5,
    userSelect: "none",
    cursor: "default",
    height: 25,

    "&:hover": {
      background: theme.palette.action.hover
    }
  },
  entrySelected: {
    background: theme.palette.action.selected,

    "&:hover": {
      background: theme.palette.action.selected
    }
  },
  entryIcon: {
    marginRight: theme.spacing(1),
    color: "gray"
  },
}));