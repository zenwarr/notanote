import { useLoad } from "./useLoad";
import { useCallback} from "react";
import { DocumentManager } from "./DocumentManager";
import { DocumentEditor } from "./DocumentEditor";
import { observer } from "mobx-react-lite";
import { WorkspaceManager } from "./WorkspaceManager";
import { useWindowTitle } from "./useWindowTitle";


export type FileViewProps = {
  fileID: string;
  className?: string;
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

  return <DocumentEditor doc={ contentLoad.data } fileId={ props.fileID } className={ props.className }/>;
}


export interface ConnectedFileViewProps {
  className?: string;
}


export const ConnectedFileView = observer((props: ConnectedFileViewProps) => {
  const ws = WorkspaceManager.instance;
  const openedDoc = ws.selectedEntry ? ws.getEntryByPath(ws.selectedFile) : undefined;

  useWindowTitle(openedDoc?.id);

  return openedDoc ? <FileView fileID={ openedDoc?.id } className={ props.className }/> : null;
});
