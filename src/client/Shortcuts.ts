import { useEffect } from "react";
import { toggleFilePicker } from "./FilePicker";


function runShortcutAction(e: KeyboardEvent) {
  if (e.code === "KeyP" && e.ctrlKey) {
    toggleFilePicker();
    e.preventDefault();
  }
}


export function useShortcuts() {
  useEffect(() => {
    document.addEventListener("keydown", runShortcutAction);

    return () => document.removeEventListener("keydown", runShortcutAction);
  }, []);
}