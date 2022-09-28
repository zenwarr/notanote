import { useEffect } from "react";
import { ClientWorkspace } from "./ClientWorkspace";


export function usePreventClose() {
  useEffect(() => {
    window.onbeforeunload = e => {
      const runner = ClientWorkspace.instance.syncJobRunner;
      if (runner && runner.isWorking()) {
        e.preventDefault();
        return "You have unfinished sync jobs";
      } else {
        return undefined;
      }
    };
  }, []);
}
