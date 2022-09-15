import * as monaco from "monaco-editor";


let themeDefined = false;

export function defineTheme() {
  if (themeDefined) {
    return;
  }

  themeDefined = true;
  monaco.editor.defineTheme("pure-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#121212"
    }
  });
}
