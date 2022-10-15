import cn from "classnames";
import * as React from "react";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import FolderIcon from "@mui/icons-material/Folder";
import DescriptionIcon from "@mui/icons-material/Description";
import { makeStyles } from "@mui/styles";
import { FixedSizeNodePublicState } from "react-vtree";
import { useTreeContext } from "./tree-context";
import { TreeNodeData } from "./tree-node-data";


type TreeNodeProps<T> = FixedSizeNodePublicState<TreeNodeData> & {
  style?: object;
}


export function TreeNode<T>(props: TreeNodeProps<T>) {
  const classes = useStyles();
  const treeCtx = useTreeContext();

  const nodeData = props.data;

  const isSelected = treeCtx.selected === nodeData.id;
  const padding = `${ nodeData.level + (nodeData.isDir ? 0 : 1.5) }em`;

  const rootClass = cn(classes.entry, {
    [classes.entrySelected]: isSelected
  });

  function onClick() {
    if (nodeData.isDir) {
      props.setOpen(!props.isOpen);
    }
    treeCtx.onSelect?.(nodeData.id);
  }

  function onContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    treeCtx.openMenu?.(e.clientX - 2, e.clientY - 4, nodeData.id);
  }

  return <span className={ rootClass } onClick={ onClick } style={ { ...props.style, paddingLeft: padding } }
               onContextMenu={ onContextMenu }>
    {
        nodeData.isDir && props.isOpen && <ExpandMoreIcon/>
    }

    {
        nodeData.isDir && !props.isOpen && <ChevronRightIcon/>
    }

    {
      nodeData.isDir
          ? <FolderIcon className={ classes.entryIcon } fontSize={ "small" }/>
          : <DescriptionIcon className={ classes.entryIcon } fontSize={ "small" }/>
    }

    <span>
      { nodeData.content }
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
