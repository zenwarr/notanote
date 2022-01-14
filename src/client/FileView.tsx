import { useLoad } from "./useLoad";
import { useCallback } from "react";
import { DocumentManager } from "./DocumentManager";
import { TextDocumentEditor } from "./TextDocumentEditor";
import { observer } from "mobx-react-lite";
import { WorkspaceManager } from "./WorkspaceManager";
import { useWindowTitle } from "./useWindowTitle";
import { CircularProgress } from "@mui/material";
import { makeStyles } from "@mui/styles";
import { PluginManager, EditorProps } from "./plugin/PluginManager";


export type FileViewProps = {
  fileID: string;
  className?: string;
}


export function FileView(props: FileViewProps) {
  const classes = useStyles();
  const contentLoad = useLoad(useCallback(async () => {
    return DocumentManager.instance.create(props.fileID);
  }, [ props.fileID ]));

  const componentLoad = useLoad<React.ComponentType<EditorProps> | undefined>(useCallback(async () => {
    if (!contentLoad.isLoaded) {
      return undefined;
    }

    const editorName = contentLoad.data?.settings.editor?.name;

    if (!editorName) {
      return TextDocumentEditor;
    } else {
      const editor = await PluginManager.instance.getEditor(editorName);
      return editor?.component ?? TextDocumentEditor;
    }
  }, [ contentLoad.data?.settings.editor?.name, contentLoad.isLoaded ]));

  if (!contentLoad.isLoaded || !componentLoad.isLoaded || !componentLoad.data) {
    return <div className={ classes.loader }>
      <CircularProgress/>
    </div>;
  }

  return <componentLoad.data doc={contentLoad.data} className={props.className} />
}


export interface ConnectedFileViewProps {
  className?: string;
}


export const ConnectedFileView = observer((props: ConnectedFileViewProps) => {
  const ws = WorkspaceManager.instance;
  const openedDoc = ws.selectedFile ? ws.getEntryByPath(ws.selectedFile) : undefined;

  useWindowTitle(openedDoc?.id);

  return openedDoc ? <FileView fileID={ openedDoc?.id } className={ props.className }/> : null;
});


const useStyles = makeStyles(theme => ({
  loader: {
    padding: theme.spacing(2),
    display: "flex",
    justifyContent: "center"
  }
}));
