import { useEffect } from "react";
import { ClientWorkspace } from "./ClientWorkspace";


export function usePreventClose() {
  useEffect(() => {
    window.onbeforeunload = e => {
      const syncJobs = ClientWorkspace.instance.syncJobRunner;
      if (syncJobs.isWorking()) {
        e.preventDefault();
        return "You have unfinished sync jobs";
      } else {
        return undefined;
      }
    };
  }, []);
}
