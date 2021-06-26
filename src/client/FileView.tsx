import { useLoad } from "./useLoad";
import { useCallback, useEffect, useState } from "react";
import { DocumentManager } from "./DocumentManager";
import { DocumentEditor } from "./DocumentEditor";
import { observer } from "mobx-react-lite";
import { WorkspaceManager } from "./WorkspaceManager";
import { useWindowTitle } from "./useWindowTitle";


export type FileViewProps = {
  fileID: string;
}


export function FileView(props: FileViewProps) {
  const contentLoad = useLoad(useCallback(async () => {
    return DocumentManager.instance.create(props.fileID);
  }, [ props.fileID ]));

  if (!contentLoad.isLoaded) {
    return <div>
      loading...
    </div>;
  }

  return <pre>
    <DocumentEditor doc={ contentLoad.data } fileId={ props.fileID }/>
  </pre>;
}


export const ConnectedFileView = observer(() => {
  const ws = WorkspaceManager.instance;
  const openedDoc = ws.selectedEntryPath ? ws.getEntryByPath(ws.selectedEntryPath) : undefined;

  useWindowTitle(openedDoc?.id);

  return openedDoc ? <FileView fileID={ openedDoc?.id }/> : null;
});
