import { CircularProgress } from "@mui/material";
import { makeStyles } from "@mui/styles";
import { StorageError, StorageErrorCode } from "@storage/entry-storage";
import { StoragePath } from "@storage/storage-path";
import { EditorContext, EditorCtxData } from "editor/editor-context";
import { observer } from "mobx-react-lite";
import * as React from "react";
import { useCallback, useEffect, useMemo } from "react";
import { Document } from "../document/document";
import { DocumentEditorProvider } from "../document/document-editor-provider";
import { ErrorBoundary } from "../error-boundary/error-boundary";
import { useLoad } from "../use-load";
import { useWindowTitle } from "../use-window-title";
import { useEntrySettingsInsideObserver } from "../workspace/use-entry-settings-inside-observer";
import { Workspace } from "../workspace/workspace";
import { CreateMissingFile } from "./create-missing-file";
import { ExternalChangesLine } from "./external-changes-line";
import { useGlobalEntrySettings } from "./global-entry-settings";


export type FileViewProps = {
  entryPath: StoragePath;
  className?: string;
}


export const FileView = observer((props: FileViewProps) => {
  const classes = useStyles();
  const cw = Workspace.instance;
  const settings = useEntrySettingsInsideObserver(props.entryPath);

  useGlobalEntrySettings(settings);

  const docLoad = useLoad(useCallback(async () => {
    return await Document.create(Workspace.instance.storage.get(props.entryPath));
  }, [ props.entryPath, cw.editorReloadTrigger ]), {
    onError: err => console.error(`Failed to load file ${ props.entryPath.normalized }`, err),
  });

  useEffect(() => {
    return () => {
      if (docLoad.data) {
        docLoad.data.close(); // not handling intentionally
      }
    };
  }, [ docLoad.data, cw.editorReloadTrigger ]);

  const componentLoad = useLoad(useCallback(async () => {
    if (!docLoad.isLoaded) {
      return undefined;
    }

    const editorProvider = new DocumentEditorProvider(Workspace.instance.plugins);
    return editorProvider.getComponent(props.entryPath, settings.editor);
  }, [ settings.editor, docLoad.isLoaded ]));

  const editorCtx: EditorCtxData = useMemo(() => ({
    entryPath: props.entryPath,
  }), [ props.entryPath ]);

  if (docLoad.loadError) {
    if (docLoad.loadError instanceof StorageError && docLoad.loadError.code === StorageErrorCode.NotExists) {
      return <CreateMissingFile path={ props.entryPath }/>;
    } else if (docLoad.loadError instanceof StorageError && docLoad.loadError.code === StorageErrorCode.NotFile) {
      return null;
    } else {
      return <div className={ classes.error }>
        { `Error loading "${ props.entryPath.normalized }": ${ docLoad.loadError }` }
      </div>;
    }
  }

  if (!docLoad.isLoaded || !componentLoad.isLoaded || !componentLoad.data) {
    return <div className={ classes.loader }>
      <CircularProgress/>
    </div>;
  }

  return <ErrorBoundary>
    <EditorContext.Provider value={ editorCtx }>
      <ExternalChangesLine doc={docLoad.data} />

      <componentLoad.data doc={ docLoad.data } className={ props.className }/>
    </EditorContext.Provider>
  </ErrorBoundary>;
});


export interface ConnectedFileViewProps {
  className?: string;
}


export const ConnectedFileView = observer((props: ConnectedFileViewProps) => {
  const openedPath = Workspace.instance.openedPath;

  useWindowTitle(openedPath?.normalized);

  return openedPath ? <FileView entryPath={ openedPath } className={ props.className }/> : null;
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
    flexDirection: "column",
    color: theme.palette.error.main,
    justifyContent: "center",
    alignItems: "center"
  }
}));
