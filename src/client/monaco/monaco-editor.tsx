import { FileSettings } from "@common/Settings";
import { observer } from "mobx-react-lite";
import * as monaco from "monaco-editor";
import { IRange } from "monaco-editor";
import { useEffect, useLayoutEffect, useRef } from "react";
import { Document } from "../document/Document";
import { getStoredEditorState, storeEditorState } from "../editor/store-state";
import { useCurrentThemeIsDark } from "../theme/theme";
import { useEntrySettingsInsideObserver } from "../workspace/use-entry-settings-inside-observer";
import { configureMonaco } from "./configure";
import { MonacoEditorStateAdapter } from "./monaco-editor-state-adapter";


export interface MonacoEditorProps {
  doc: Document;
  className?: string;
}


function getOptionsFromSettings(settings: FileSettings): monaco.editor.IEditorOptions & monaco.editor.IGlobalEditorOptions {
  let fontSize = settings.fontSize;
  if (typeof fontSize !== "number") {
    fontSize = undefined;
  }

  return {
    fontSize,
    fontFamily: settings.fontFamily,
    renderWhitespace: settings.drawWhitespace ? "all" : "none",
    tabSize: settings.tabWidth
  };
}


export const MonacoEditor = observer((props: MonacoEditorProps) => {
  const containerRef = useRef<any>();
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor>();
  const stateAdapter = useRef<MonacoEditorStateAdapter>(props.doc.getEditorStateAdapter() as MonacoEditorStateAdapter);
  const isDarkTheme = useCurrentThemeIsDark();

  const settings = useEntrySettingsInsideObserver(props.doc.entry.path);

  useEffect(() => {
    const editor = editorRef.current;
    if (editor) {
      editor.updateOptions(getOptionsFromSettings(settings));
    }
  }, [ settings ]);

  useEffect(() => {
    configureMonaco();
    monaco.editor.setTheme(isDarkTheme ? "pure-dark" : "vs");

    const editor = monaco.editor.create(containerRef.current, {
      model: stateAdapter.current.model,
      wordWrap: "on",
      unicodeHighlight: {
        ambiguousCharacters: false
      },
      ...getOptionsFromSettings(settings)
    });
    editorRef.current = editor;

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

    return () => {
      editor.dispose();
    };
  }, []);

  useLayoutEffect(() => {
    monaco.editor.setTheme(isDarkTheme ? "pure-dark" : "vs");
  }, [ isDarkTheme ]);

  return <div ref={ containerRef } className={ props.className }/>;
});
