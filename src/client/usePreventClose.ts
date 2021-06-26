import { useEffect } from "react";
import { DocumentManager } from "./DocumentManager";


export function usePreventClose() {
  useEffect(() => {
    window.onbeforeunload = e => {
      if (DocumentManager.instance.hasUnsavedChanges) {
        e.preventDefault();
        return "You have unsaved changes";
      } else {
        return undefined;
      }
    };
  }, []);
}
