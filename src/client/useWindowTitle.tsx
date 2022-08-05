import { useEffect, useState } from "react";
import * as path from "path";
import { ClientWorkspace } from "./ClientWorkspace";
import { autorun } from "mobx";


function getDocTitle(hasUnsyncedChanges: boolean, fileId: string | undefined) {
  const prefix = hasUnsyncedChanges ? "* " : "";

  if (fileId) {
    const fileName = path.basename(fileId);
    return `${ prefix }${ fileName } — Nuclear notes`;
  } else {
    return `${ prefix }Nuclear notes`;
  }
}


export function useWindowTitle(fileId: string | undefined) {
  const syncWorker = ClientWorkspace.instance.syncWorker;
  const [ hasUnsavedChanges, setHasUnsavedChanges ] = useState(syncWorker.pendingRoots.length !== 0 || syncWorker.pendingConflicts.length !== 0);

  autorun(() => {
    const newHasChanges = syncWorker.pendingConflicts.length !== 0 || syncWorker.pendingRoots.length !== 0;
    if (newHasChanges !== hasUnsavedChanges) {
      setHasUnsavedChanges(newHasChanges);
    }
  });

  useEffect(() => {
    document.title = getDocTitle(hasUnsavedChanges, fileId);

    return () => {
      document.title = getDocTitle(hasUnsavedChanges, undefined);
    };
  }, [ fileId, hasUnsavedChanges ]);
}
