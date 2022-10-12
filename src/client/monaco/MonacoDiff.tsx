import { Box } from "@mui/material";
import * as monaco from "monaco-editor";
import { ReactNode, useEffect, useLayoutEffect, useRef } from "react";
import { useCurrentThemeIsDark } from "../theme/theme";
import { defineTheme } from "./Theme";


export type MonacoDiffProps = {
  className?: string;
  original: string | undefined;
  originalTitle?: ReactNode;
  modified: string | undefined;
  modifiedTitle?: ReactNode;
}


export function MonacoDiff(props: MonacoDiffProps) {
  const containerRef = useRef<any>();
  const isDarkTheme = useCurrentThemeIsDark();

  useEffect(() => {
    defineTheme();
    monaco.editor.setTheme(isDarkTheme ? "pure-dark" : "vs");

    const originalModel = monaco.editor.createModel(
        props.original || "",
        "text/plain"
    );
    const modifiedModel = monaco.editor.createModel(
        props.modified || "",
        "text/plain"
    );

    const editor = monaco.editor.createDiffEditor(containerRef.current, {
      wordWrap: "on",
      renderWhitespace: "all",
      readOnly: true,
      diffWordWrap: "on",
      enableSplitViewResizing: false,
      renderMarginRevertIcon: false,
      unicodeHighlight: {
        ambiguousCharacters: false
      }
    });
    editor.setModel({
      original: originalModel,
      modified: modifiedModel
    });

    const nav = monaco.editor.createDiffNavigator(editor, {
      followsCaret: true,
      ignoreCharChanges: true
    });

    editor.onDidUpdateDiff(() => {
      nav.next();
    });
  }, []);

  useLayoutEffect(() => {
    monaco.editor.setTheme(isDarkTheme ? "pure-dark" : "vs");
  }, [ isDarkTheme ]);

  return <>
    <Box display={ "flex" } justifyContent={ "space-between" } mb={ 1 }>
      <Box width={ "100%" }>
        { props.originalTitle }
      </Box>

      <Box width={ "100%" }>
        { props.modifiedTitle }
      </Box>
    </Box>

    <div ref={ containerRef } className={ props.className }/>
  </>;
}
