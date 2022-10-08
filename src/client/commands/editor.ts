import { Workspace } from "../workspace/Workspace";


export async function reloadEditor() {
  Workspace.instance.triggerEditorReload();
}
