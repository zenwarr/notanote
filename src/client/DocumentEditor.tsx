import * as React from "react";
import * as path from "path";
import { createRef, useEffect, useRef, useState } from "react";
import { Document } from "./Document";
import { DocumentManager } from "./DocumentManager";
import "./DocumentEditor.css";
import { EditorView } from "@codemirror/view";
import { makeStyles } from "@material-ui/core";


export type DocumentEditorProps = {
  fileId: string;
  doc: Document;
  className?: string;
}


export function DocumentEditor(props: DocumentEditorProps) {
  const containerRef = useRef<any>();
  const viewRef = useRef<EditorView>();

  useEffect(() => {
    const view = new EditorView({
      state: props.doc.editorState,
      parent: containerRef.current
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      DocumentManager.instance.close(props.fileId);
    };
  }, []);

  useEffect(() => {
    viewRef.current?.focus();
  }, [ props.doc ]);

  return <div ref={ containerRef } className={ props.className }/>;
}


const useStyles = makeStyles(theme => ({
  root: {},
  titleInput: {
    width: "100%",
    marginBottom: theme.spacing(1),
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
    border: 0,
    background: "transparent",
    fontSize: "25px",
    fontWeight: "bold",

    "&:focus": {
      outline: "none"
    },

    "&::placeholder": {
      color: "lightgray"
    }
  }
}));
