import { useEffect, useState } from "react";
import * as path from "path";
import { Workspace } from "./workspace/workspace";
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
  const sync = Workspace.instance.sync;
  const [ hasUnsavedChanges, setHasUnsavedChanges ] = useState(sync ? sync.actualDiff.length > 0 : false);

  autorun(() => {
    if (!sync) {
      return;
    }

    const newHasChanges = sync.actualDiff.length > 0;
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
