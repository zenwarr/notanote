import { PluginManager } from "./plugin/PluginManager";
import { Document } from "./Document";
import { MonacoEditor } from "./monaco/MonacoEditor";
import { MonacoEditorStateAdapter } from "./monaco/MonacoEditorStateAdapter";
import { CodeEditorStateAdapter } from "./code-editor/CodeEditorState";
import { CodeEditor } from "./code-editor/CodeEditor";


const TEXT_EXTS = [ ".md", ".txt" ];


function isTextFile(filename: string): boolean {
  const ext = filename.slice(filename.lastIndexOf("."));
  return TEXT_EXTS.indexOf(ext) >= 0;
}


export class DocumentEditorProvider {
  async getStateAdapter(doc: Document) {
    if (doc.settings.editor != null) {
      const editor = await PluginManager.instance.getCustomEditorForDocument(doc);
      if (!editor) {
        return isTextFile(doc.entryPath.normalized) ? new CodeEditorStateAdapter(doc) : new MonacoEditorStateAdapter(doc);
      } else {
        return new editor.stateAdapter(doc);
      }
    } else {
      return isTextFile(doc.entryPath.normalized) ? new CodeEditorStateAdapter(doc) : new MonacoEditorStateAdapter(doc);
    }
  }


  async getComponent(doc: Document) {
    const editor = await PluginManager.instance.getCustomEditorForDocument(doc);
    if (editor?.component) {
      return editor.component;
    } else {
      return isTextFile(doc.entryPath.normalized) ? CodeEditor : MonacoEditor;
    }
  }


  static instance = new DocumentEditorProvider();
}
