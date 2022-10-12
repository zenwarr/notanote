import { IRange } from "monaco-editor";
import * as monaco from "monaco-editor";
import { useEffect, useLayoutEffect, useRef } from "react";
import { Document } from "../document/Document";
import { getStoredEditorState, storeEditorState } from "../editor/store-state";
import { useCurrentThemeIsDark } from "../theme/theme";
import { MonacoEditorStateAdapter } from "./monaco-editor-state-adapter";
import { configureMonaco } from "./configure";


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
    configureMonaco();
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

    const storedSelection = getStoredEditorState(props.doc.entry.path, "monaco");
    if (storedSelection) {
      editor.setSelection(storedSelection as IRange);
      editor.revealRangeInCenter(storedSelection as IRange);
    }

    editor.focus();

    editor.onDidChangeCursorSelection(e => {
      const range: IRange = {
        startLineNumber: e.selection.startLineNumber,
        startColumn: e.selection.startColumn,
        endLineNumber: e.selection.endLineNumber,
        endColumn: e.selection.endColumn
      };

      storeEditorState(props.doc.entry.path, "monaco", range);
    });
  }, []);

  useLayoutEffect(() => {
    monaco.editor.setTheme(isDarkTheme ? "pure-dark" : "vs");
  }, [ isDarkTheme ]);

  return <div ref={ containerRef } className={ props.className }/>;
}
