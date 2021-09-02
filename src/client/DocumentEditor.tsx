import * as React from "react";
import { useEffect, useLayoutEffect, useRef } from "react";
import { Document } from "./Document";
import { DocumentManager } from "./DocumentManager";
import "./DocumentEditor.css";
import { EditorView } from "@codemirror/view";
import { FileSettings } from "../common/WorkspaceEntry";
import { useCurrentThemeIsDark } from "./Theme";


export type DocumentEditorProps = {
  fileId: string;
  doc: Document;
  className?: string;
}


export function DocumentEditor(props: DocumentEditorProps) {
  const containerRef = useRef<any>();
  const viewRef = useRef<EditorView>();
  const isDarkTheme = useCurrentThemeIsDark();

  useEffect(() => {
    const view = new EditorView({
      state: props.doc.editorState,
      parent: containerRef.current
    });

    const cursorPos = props.doc.editorState.selection.ranges[0]?.head;
    if (cursorPos != null) {
      view.scrollPosIntoView(cursorPos);
    }

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
      setEditorVars(containerRef.current, props.doc.settings, isDarkTheme);
    }
  }, [ props.doc.settings, isDarkTheme ]);

  return <div ref={ containerRef } className={ props.className }/>;
}


function numberValueToPropValue(value: number | undefined): string | null {
  return value == null ? null : `${ value }px`;
}


function sizeValueToPropValue(value: number | string | undefined): string | null {
  if (typeof value === "string") {
    return value;
  } else {
    return numberValueToPropValue(value);
  }
}


function setEditorVars(el: HTMLElement, settings: FileSettings, isDarkTheme: boolean) {
  el.style.setProperty("--editor-text-indent", numberValueToPropValue(settings.textIndent));
  el.style.setProperty("--editor-line-height", settings.lineHeight == null ? null : "" + settings.lineHeight);
  el.style.setProperty("--editor-paragraph-spacing", numberValueToPropValue(settings.paragraphSpacing));
  el.style.setProperty("--editor-hyphens", settings.hyphens ?? null);
  el.style.setProperty("--editor-font-size", sizeValueToPropValue(settings.fontSize));
  el.style.setProperty("--editor-font-family", settings.fontFamily ?? null);
  el.style.setProperty("--editor-caret-color", isDarkTheme ? "lightgray" : "black");

  document.documentElement.lang = settings.lang || "en";
}
