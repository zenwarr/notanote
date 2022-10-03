import { useLoad } from "./useLoad";
import * as React from "react";
import { useCallback } from "react";
import { Document } from "./document/Document";
import { observer } from "mobx-react-lite";
import { Workspace } from "./workspace/Workspace";
import { useWindowTitle } from "./useWindowTitle";
import { CircularProgress } from "@mui/material";
import { makeStyles } from "@mui/styles";
import { EditorProps } from "./plugin/PluginManager";
import { ErrorBoundary } from "./error-boundary/ErrorBoundary";
import { StoragePath } from "@storage/StoragePath";
import { DocumentEditorProvider } from "./document/DocumentEditorProvider";


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
    const doc = await Document.create(Workspace.instance.storage.get(props.entryPath));
    applyGlobalDocSettings(doc);
    return doc;
  }, [ props.entryPath ]), {
    onError: err => console.error(`Failed to load file ${ props.entryPath.normalized }`, err),
  });

  const componentLoad = useLoad<React.ComponentType<EditorProps> | undefined>(useCallback(async () => {
    if (!contentLoad.isLoaded) {
      return undefined;
    }

    const editorProvider = new DocumentEditorProvider(Workspace.instance.plugins);
    return editorProvider.getComponent(contentLoad.data);
  }, [ contentLoad.data?.settings.editor?.name, contentLoad.isLoaded ]));

  if (contentLoad.loadError) {
    return <div className={ classes.error }>
      Error loading "{ props.entryPath.normalized }": { contentLoad.loadError }
    </div>
  }

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
  const ws = Workspace.instance;
  const openedDoc = ws.selectedFile ? ws.storage.get(ws.selectedFile) : undefined;

  useWindowTitle(openedDoc?.path.normalized);

  return openedDoc ? <FileView entryPath={ openedDoc.path } className={ props.className }/> : null;
});


const useStyles = makeStyles(theme => ({
  loader: {
    padding: theme.spacing(2),
    display: "flex",
    justifyContent: "center"
  },

  error: {
    padding: theme.spacing(2),
    display: "flex",
    color: theme.palette.error.main,
    justifyContent: "center"
  }
}));
