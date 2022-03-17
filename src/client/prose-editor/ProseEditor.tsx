// import { useEffect, useLayoutEffect, useRef } from "react";
// import { EditorView } from "prosemirror-view";
// import { ProseEditorStateAdapter } from "./ProseEditorStateAdapter";
// import { Document } from "../Document";
// import { DocumentManager } from "../DocumentManager";
// import "prosemirror-view/style/prosemirror.css";
// import "./ProseEditor.css";
// import { useCurrentThemeIsDark } from "../Theme";
// import { setEditorVars } from "../editor/EditorVars";
//
//
// export interface ProseEditorProps {
//   doc: Document;
//   className?: string;
// }
//
//
// export function ProseEditor(props: ProseEditorProps) {
//   const containerRef = useRef<any>();
//   const viewRef = useRef<EditorView>();
//   const stateAdapter = useRef<ProseEditorStateAdapter>(props.doc.getEditorStateAdapter() as ProseEditorStateAdapter);
//   const editorState = stateAdapter.current.state;
//   const isDarkTheme = useCurrentThemeIsDark();
//
//   useEffect(() => {
//     const view = new EditorView(containerRef.current, {
//       state: editorState,
//       dispatchTransaction: tx => {
//         view.updateState(stateAdapter.current.applyTx(tx));
//       }
//     });
//
//     viewRef.current = view;
//
//     return () => {
//       view.destroy();
//       DocumentManager.instance.close(props.doc.entryPath);
//     };
//   }, []);
//
//   useEffect(() => {
//     viewRef.current?.focus();
//   }, [ props.doc ]);
//
//   useLayoutEffect(() => {
//     if (containerRef.current) {
//       setEditorVars(containerRef.current, props.doc.settings, isDarkTheme);
//     }
//   }, [ props.doc.settings, isDarkTheme ]);
//
//   return <div ref={ containerRef } className={ props.className } style={ { padding: 20 } }/>;
// }
