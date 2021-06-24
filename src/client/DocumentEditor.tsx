import { useEffect, useRef } from "react";
import { Document } from "./Document";
import { DocumentManager } from "./DocumentManager";
import "./DocumentEditor.css";
import { EditorView } from "@codemirror/view";


export type DocumentEditorProps = {
  fileId: string;
  doc: Document;
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

  return <div ref={ containerRef }/>;
}
