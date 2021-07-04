import * as React from "react";
import { useEffect, useLayoutEffect, useRef } from "react";
import { Document } from "./Document";
import { DocumentManager } from "./DocumentManager";
import "./DocumentEditor.css";
import { EditorView } from "@codemirror/view";
import { makeStyles } from "@material-ui/core";
import { FileSettings } from "../common/WorkspaceEntry";


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

  useLayoutEffect(() => {
    if (containerRef.current) {
      setEditorVars(containerRef.current, props.doc.settings);
    }
  }, [ props.doc.settings ]);

  return <div ref={ containerRef } className={ props.className }/>;
}


function numberValueToPropValue(value: number | undefined): string | null {
  return value == null ? null : `${ value }px`;
}


function setEditorVars(el: HTMLElement, settings: FileSettings) {
  el.style.setProperty("--editor-text-indent", numberValueToPropValue(settings.textIndent));
  el.style.setProperty("--editor-line-height", settings.lineHeight == null ? null : "" + settings.lineHeight);
  el.style.setProperty("--editor-paragraph-spacing", numberValueToPropValue(settings.paragraphSpacing));
  el.style.setProperty("--editor-hyphens", settings.hyphens ?? null);
  el.style.setProperty("--editor-font-size", numberValueToPropValue(settings.fontSize));
  el.style.setProperty("--editor-font-family", settings.fontFamily ?? null);

  document.documentElement.lang = settings.lang || "en";
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
