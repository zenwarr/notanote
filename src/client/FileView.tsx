import { useLoad } from "./useLoad";
import { useCallback } from "react";
import { DocumentManager } from "./DocumentManager";
import { DocumentEditor } from "./DocumentEditor";


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
    <DocumentEditor doc={ contentLoad.data } fileId={props.fileID}/>
  </pre>;
}
