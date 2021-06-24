import * as React from "react";
import { createRef, useEffect, useRef, useState } from "react";
import { Document } from "./Document";
import { DocumentManager } from "./DocumentManager";
import "./DocumentEditor.css";
import { EditorView } from "@codemirror/view";
import { makeStyles } from "@material-ui/core";


export type DocumentEditorProps = {
  fileId: string;
  doc: Document;
  onTitleChange?: (title: string) => void;
}


export function DocumentEditor(props: DocumentEditorProps) {
  const containerRef = useRef<any>();
  const titleInputRef = createRef<HTMLInputElement>();
  const viewRef = useRef<EditorView>();
  const classes = useStyles();
  const [ title, setTitle ] = useState<string | undefined>(undefined);

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
    titleInputRef.current?.focus();
  }, [ props.doc ]);

  function onTitleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      viewRef.current?.focus();
      e.preventDefault();
    }
  }

  function onTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    let title = e.target.value;
    setTitle(title);
    props.onTitleChange?.(title);
  }

  return <div>
    <input type={ "text" } ref={ titleInputRef } className={ classes.titleInput } onKeyDown={ onTitleKey } value={ title }
           onChange={ onTitleChange }/>

    <div ref={ containerRef }/>
  </div>;
}


const useStyles = makeStyles(theme => ({
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
    }
  }
}));
