import { useEffect } from "react";
import { PaletteMode, togglePalette } from "./PaletteProvider";


function runShortcutAction(e: KeyboardEvent) {
  if (e.code === "KeyP" && e.ctrlKey) {
    e.preventDefault();
    togglePalette(e.altKey ? PaletteMode.Command : PaletteMode.File);
  }
}


export function useShortcuts() {
  useEffect(() => {
    document.addEventListener("keydown", runShortcutAction);

    return () => document.removeEventListener("keydown", runShortcutAction);
  }, []);
}
