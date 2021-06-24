import { useLoad } from "./useLoad";
import { useCallback, useEffect, useState } from "react";
import { DocumentManager } from "./DocumentManager";
import { DocumentEditor } from "./DocumentEditor";
import { observer } from "mobx-react-lite";
import { WorkspaceManager } from "./WorkspaceManager";


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
  const [ openedDoc, setOpenedDoc ] = useState<string | undefined>();

  const selectedEntryPath = WorkspaceManager.instance.selectedEntryPath;
  useEffect(() => {
    const selectedEntry = selectedEntryPath ? WorkspaceManager.instance.getEntryByPath(selectedEntryPath) : undefined;
    if (selectedEntry && selectedEntry.type !== "dir") {
      setOpenedDoc(selectedEntry.id);
    }
  }, [ selectedEntryPath ]);

  return openedDoc ? <FileView fileID={ openedDoc }/> : null;
});
