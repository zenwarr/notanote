import { useEffect, useLayoutEffect, useRef } from "react";
import { Document } from "./Document";
import { DocumentManager } from "./DocumentManager";
import "./TextDocumentEditor.css";
import { EditorView } from "@codemirror/view";
import { FileSettings } from "../common/WorkspaceEntry";
import { useCurrentThemeIsDark } from "./Theme";
import { CmDocumentEditorStateAdapter } from "./EditorState";
import assert from "assert";


export type TextDocumentEditorProps = {
  doc: Document;
  className?: string;
}


export function TextDocumentEditor(props: TextDocumentEditorProps) {
  const containerRef = useRef<any>();
  const viewRef = useRef<EditorView>();
  const isDarkTheme = useCurrentThemeIsDark();
  const stateAdapter = useRef<CmDocumentEditorStateAdapter>(props.doc.getEditorStateAdapter() as CmDocumentEditorStateAdapter);
  assert(stateAdapter.current instanceof CmDocumentEditorStateAdapter);
  const editorState = stateAdapter.current.state;

  useEffect(() => {
    const view = new EditorView({
      state: editorState,
      parent: containerRef.current
    });

    const cursorPos = editorState.selection.ranges[0]?.head;
    if (cursorPos != null) {
      view.scrollPosIntoView(cursorPos);
    }

    viewRef.current = view;

    return () => {
      view.destroy();
      DocumentManager.instance.close(props.doc.fileId);
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
  el.style.setProperty("--editor-whitespace-color", isDarkTheme ? "gray" : "#b5b5b5");
  el.style.setProperty("--editor-selection-color", isDarkTheme ? "#464646" : "#d7d4f0");
  el.style.setProperty("--editor-cursor-color", isDarkTheme ? "white" : "black");

  document.documentElement.lang = settings.lang || "en";
}
