import { Workspace } from "../workspace/workspace";


export async function reloadEditor() {
  Workspace.instance.triggerEditorReload();
}
