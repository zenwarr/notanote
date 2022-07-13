import { useEffect } from "react";
import { ClientWorkspace } from "./ClientWorkspace";


export function usePreventClose() {
  useEffect(() => {
    window.onbeforeunload = e => {
      const syncWorker = ClientWorkspace.instance.syncWorker;
      if (syncWorker.pendingConflicts.length || syncWorker.pendingRoots.length) {
        e.preventDefault();
        return "You have unsaved changes";
      } else {
        return undefined;
      }
    };
  }, []);
}
