import { SpecialPath } from "@storage/special-path";
import { WorkspaceSettingsProvider } from "@storage/workspace-settings-provider";
import * as monaco from "monaco-editor";
import { getUriFromPath } from "./get-uri";


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
    schemaValidation: "error",
    enableSchemaRequest: false,
    schemas: [
      {
        uri: `nuclear-schema:${ SpecialPath.Settings.normalized }`,
        fileMatch: [ getUriFromPath(SpecialPath.Settings).toString() ],
        schema: require("@storage/workspace-settings-schema.json")
      }
    ]
  });
}
