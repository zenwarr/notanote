import { useEffect } from "react";
import { PaletteMode, togglePalette } from "./palette/PaletteProvider";


function runShortcutAction(e: KeyboardEvent) {
  if (e.code === "KeyP" && e.ctrlKey) {
    e.preventDefault();
    togglePalette(e.altKey ? PaletteMode.Command : PaletteMode.File);
  } else if (e.code === "KeyS" && e.ctrlKey) {
    e.preventDefault();
  }
}


export function useShortcuts() {
  useEffect(() => {
    document.addEventListener("keydown", runShortcutAction);

    return () => document.removeEventListener("keydown", runShortcutAction);
  }, []);
}
