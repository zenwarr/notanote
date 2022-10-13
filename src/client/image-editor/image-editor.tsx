import { makeStyles } from "@mui/styles";
import { useEffect, useRef } from "react";
import { Box } from "@mui/material";
import { EditorProps } from "../plugin/plugin-manager";
import * as mobx from "mobx-react-lite";
import { ImageEditorStateAdapter } from "./image-editor-state";


export const ImageEditor = mobx.observer((props: EditorProps) => {
  const stateRef = useRef(props.doc.getEditorStateAdapter() as ImageEditorStateAdapter);
  const classes = useStyles();

  return <Box display={ "flex" } alignItems={ "center" } justifyContent={ "center" } className={ classes.container }>
    <img src={ stateRef.current.objectUrl } className={ classes.image }/>
  </Box>;
});


const useStyles = makeStyles(theme => ({
  image: {
    maxWidth: "100%",
    maxHeight: "100%",
    objectFit: "cover"
  },
  container: {
    height: "calc(100% - 40px)"
  }
}));
