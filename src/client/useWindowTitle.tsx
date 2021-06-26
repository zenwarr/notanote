import { useEffect, useState } from "react";
import * as path from "path";
import { DocumentManager } from "./DocumentManager";
import { autorun } from "mobx";


function getDocTitle(hasUnsyncedChanges: boolean, fileId: string | undefined) {
  const prefix = hasUnsyncedChanges ? "* " : "";

  if (fileId) {
    const fileName = path.basename(fileId);
    return `${ prefix }${ fileName } — Notes app`;
  } else {
    return `${ prefix }Notes app`;
  }
}


export function useWindowTitle(fileId: string | undefined) {
  const [ hasUnsavedChanges, setHasUnsavedChanges ] = useState(DocumentManager.instance.hasUnsavedChanges);

  autorun(() => {
    const newHasChanges = DocumentManager.instance.hasUnsavedChanges;
    if (newHasChanges !== hasUnsavedChanges) {
      setHasUnsavedChanges(DocumentManager.instance.hasUnsavedChanges);
    }
  });

  useEffect(() => {
    document.title = getDocTitle(hasUnsavedChanges, fileId);

    return () => {
      document.title = getDocTitle(hasUnsavedChanges, undefined);
    };
  }, [ fileId, hasUnsavedChanges ]);
}
