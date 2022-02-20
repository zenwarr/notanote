import { useLoad } from "./useLoad";
import * as React from "react";
import { useCallback } from "react";
import { DocumentManager } from "./DocumentManager";
import { Document } from "./Document";
import { observer } from "mobx-react-lite";
import { ClientWorkspace } from "./ClientWorkspace";
import { useWindowTitle } from "./useWindowTitle";
import { CircularProgress } from "@mui/material";
import { makeStyles } from "@mui/styles";
import { EditorProps, PluginManager } from "./plugin/PluginManager";
import { ErrorBoundary } from "./error-boundary/ErrorBoundary";
import { StoragePath } from "../common/storage/StoragePath";
import { CodeEditor } from "./code-editor/CodeEditor";
import { DocumentEditorProvider } from "./DocumentEditorProvider";


export type FileViewProps = {
  entryPath: StoragePath;
  className?: string;
}


function fontTagExists(url: string) {
  const links = document.head.getElementsByTagName("link");
  for (let i = 0; i < links.length; i++) {
    if (links[i].href === url) {
      return true;
    }
  }

  return false;
}


function applyGlobalDocSettings(doc: Document) {
  if (doc.settings.remoteFonts) {
    for (const font of doc.settings.remoteFonts) {
      if (fontTagExists(font)) {
        continue;
      }

      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = font;
      document.head.appendChild(link);
    }
  }
}


export function FileView(props: FileViewProps) {
  const classes = useStyles();
  const contentLoad = useLoad(useCallback(async () => {
    const doc = await DocumentManager.instance.create(props.entryPath);
    applyGlobalDocSettings(doc);
    return doc;
  }, [ props.entryPath ]));

  const componentLoad = useLoad<React.ComponentType<EditorProps> | undefined>(useCallback(async () => {
    if (!contentLoad.isLoaded) {
      return undefined;
    }

    return DocumentEditorProvider.instance.getComponent(contentLoad.data);
  }, [ contentLoad.data?.settings.editor?.name, contentLoad.isLoaded ]));

  if (!contentLoad.isLoaded || !componentLoad.isLoaded || !componentLoad.data) {
    return <div className={ classes.loader }>
      <CircularProgress/>
    </div>;
  }

  return <ErrorBoundary>
    <componentLoad.data doc={ contentLoad.data } className={ props.className }/>
  </ErrorBoundary>;
}


export interface ConnectedFileViewProps {
  className?: string;
}


export const ConnectedFileView = observer((props: ConnectedFileViewProps) => {
  const ws = ClientWorkspace.instance;
  const openedDoc = ws.selectedFile ? ws.storage.get(ws.selectedFile) : undefined;

  useWindowTitle(openedDoc?.path.normalized);

  return openedDoc ? <FileView entryPath={ openedDoc.path } className={ props.className }/> : null;
});


const useStyles = makeStyles(theme => ({
  loader: {
    padding: theme.spacing(2),
    display: "flex",
    justifyContent: "center"
  }
}));
