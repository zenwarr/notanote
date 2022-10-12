import { WorkspaceSettingsProvider } from "@storage/workspace-settings-provider";
import * as monaco from "monaco-editor";


let inited = false;

export function configureMonaco() {
  if (inited) {
    return;
  }

  inited = true;
  monaco.editor.defineTheme("pure-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#121212"
    }
  });

  monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
    validate: true,
    schemas: [
      {
        uri: "https://nuclear-notes.com/schemas/settings.json",
        fileMatch: [ "nuclear-file://settings.json" ],
        schema: WorkspaceSettingsProvider.schema
      }
    ]
  });
}
