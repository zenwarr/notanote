import * as monaco from "monaco-editor";
import { useEffect, useLayoutEffect, useRef } from "react";
import { Document } from "../Document";
import { DocumentManager } from "../DocumentManager";
import { useCurrentThemeIsDark } from "../Theme";
import { MonacoEditorStateAdapter } from "./MonacoEditorStateAdapter";
import { defineTheme } from "./Theme";


export interface MonacoEditorProps {
  doc: Document;
  className?: string;
}


function getLanguageFromFileName(filename: string) {
  const ext = filename.split(".").pop();
  if (ext === "ts" || ext === "tsx") {
    return "typescript";
  } else if (ext === "js" || ext === "jsx") {
    return "javascript";
  } else if (ext === "json") {
    return "json";
  } else {
    return "plaintext";
  }
}


export function MonacoEditor(props: MonacoEditorProps) {
  const containerRef = useRef<any>();
  const stateAdapter = useRef<MonacoEditorStateAdapter>(props.doc.getEditorStateAdapter() as MonacoEditorStateAdapter);
  const isDarkTheme = useCurrentThemeIsDark();

  useEffect(() => {
    defineTheme();
    monaco.editor.setTheme(isDarkTheme ? "pure-dark" : "vs");

    let fontSize = props.doc.settings.fontSize;
    if (typeof fontSize !== "number") {
      fontSize = undefined;
    }

    const editor = monaco.editor.create(containerRef.current, {
      value: stateAdapter.current.initialText,
      language: getLanguageFromFileName(props.doc.entry.path.normalized),
      wordWrap: "on",
      renderWhitespace: "all",
      fontSize,
      unicodeHighlight: {
        ambiguousCharacters: false
      }
    });
    stateAdapter.current.model = editor.getModel();

    return () => {
      DocumentManager.instance.close(props.doc.entry.path);
    };
  }, []);

  useLayoutEffect(() => {
    monaco.editor.setTheme(isDarkTheme ? "pure-dark" : "vs");
  }, [ isDarkTheme ]);

  return <div ref={ containerRef } className={ props.className }/>;
}
