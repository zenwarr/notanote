import { useEffect } from "react";
import { Workspace } from "./Workspace";


export function usePreventClose() {
  useEffect(() => {
    window.onbeforeunload = e => {
      const runner = Workspace.instance.syncJobRunner;
      if (runner && runner.isWorking()) {
        e.preventDefault();
        return "You have unfinished sync jobs";
      } else {
        return undefined;
      }
    };
  }, []);
}
