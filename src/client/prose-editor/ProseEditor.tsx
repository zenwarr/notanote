import { useEffect, useRef } from "react";
import { EditorView } from "prosemirror-view";
import { ProseEditorStateAdapter } from "./ProseEditorStateAdapter";
import { Document } from "../Document";
import { DocumentManager } from "../DocumentManager";
require("prosemirror-view/style/prosemirror.css");


export interface ProseEditorProps {
  doc: Document;
  className?: string;
}


export function ProseEditor(props: ProseEditorProps) {
  const containerRef = useRef<any>();
  const viewRef = useRef<EditorView>();
  const stateAdapter = useRef<ProseEditorStateAdapter>(props.doc.getEditorStateAdapter() as ProseEditorStateAdapter);
  const editorState = stateAdapter.current.state;

  useEffect(() => {
    const view = new EditorView(containerRef.current, {
      state: editorState,
      dispatchTransaction: tx => {
        view.updateState(stateAdapter.current.applyTx(tx))
      }
    });

    // const cursorPos = editorState.selection.ranges[0]?.head;
    // if (cursorPos != null) {
    //   view.scrollPosIntoView(cursorPos);
    // }

    viewRef.current = view;

    return () => {
      view.destroy();
      DocumentManager.instance.close(props.doc.entryPath);
    };
  }, []);

  useEffect(() => {
    viewRef.current?.focus();
  }, [ props.doc ]);

  return <div ref={ containerRef } className={ props.className }/>;
}
