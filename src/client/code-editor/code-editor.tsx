import { observer } from "mobx-react-lite";
import { useEffect, useLayoutEffect, useRef} from "react";
import { Document } from "../document/Document";
import "./code-editor.css";
import { EditorView } from "@codemirror/view";
import { useCurrentThemeIsDark } from "../theme/theme";
import { useEntrySettingsInsideObserver } from "../workspace/use-entry-settings-inside-observer";
import { CodeEditorStateAdapter } from "./code-editor-state";
import assert from "assert";
import { setEditorVars } from "../editor/editor-vars";


export type CodeEditorProps = {
  doc: Document;
  className?: string;
}


export const CodeEditor = observer((props: CodeEditorProps) => {
  const containerRef = useRef<any>();
  const viewRef = useRef<EditorView>();
  const isDarkTheme = useCurrentThemeIsDark();
  const stateAdapter = useRef<CodeEditorStateAdapter>(props.doc.getEditorStateAdapter() as CodeEditorStateAdapter);
  assert(stateAdapter.current instanceof CodeEditorStateAdapter);
  const editorState = stateAdapter.current.state;
  const settings = useEntrySettingsInsideObserver(props.doc.entry.path);

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
    stateAdapter.current.view = view;

    return () => {
      view.destroy();
    };
  }, [ props.doc ]);

  useEffect(() => {
    viewRef.current?.focus();
  }, [ props.doc ]);

  useLayoutEffect(() => {
    if (containerRef.current) {
      setEditorVars(containerRef.current, settings, isDarkTheme);
    }
  }, [ settings, isDarkTheme ]);

  return <div ref={ containerRef } className={ props.className }/>;
});
