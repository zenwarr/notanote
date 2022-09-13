import { useEffect, useLayoutEffect, useRef} from "react";
import { Document } from "../Document";
import { DocumentManager } from "../DocumentManager";
import "./CodeEditor.css";
import { EditorView } from "@codemirror/view";
import { useCurrentThemeIsDark } from "../Theme";
import { CodeEditorStateAdapter } from "./CodeEditorState";
import assert from "assert";
import { setEditorVars } from "../editor/EditorVars";


export type CodeEditorProps = {
  doc: Document;
  className?: string;
}


export function CodeEditor(props: CodeEditorProps) {
  const containerRef = useRef<any>();
  const viewRef = useRef<EditorView>();
  const isDarkTheme = useCurrentThemeIsDark();
  const stateAdapter = useRef<CodeEditorStateAdapter>(props.doc.getEditorStateAdapter() as CodeEditorStateAdapter);
  assert(stateAdapter.current instanceof CodeEditorStateAdapter);
  const editorState = stateAdapter.current.state;

  useEffect(() => {
    const view = new EditorView({
      state: editorState,
      parent: containerRef.current
    });

    const cursorPos = editorState.selection.ranges[0]?.head;
    if (cursorPos != null) {
      view.dispatch({
        effects: EditorView.scrollIntoView(cursorPos)
      });
    }

    viewRef.current = view;

    return () => {
      view.destroy();
      DocumentManager.instance.close(props.doc.entry.path);
    };
  }, [ props.doc ]);

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
