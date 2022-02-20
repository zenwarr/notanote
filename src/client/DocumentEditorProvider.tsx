import * as React from "react";
import { PluginManager } from "./plugin/PluginManager";
import { Document, DocumentEditorStateAdapter } from "./Document";


const TEXT_EXTS = [ ".md", ".txt" ];


function isTextFile(filename: string): boolean {
  const ext = filename.slice(filename.lastIndexOf("."));
  return TEXT_EXTS.indexOf(ext) >= 0;
}


export interface DocumentEditorProps {
  doc: Document;
}


export class DocumentEditorProvider {
  async getStateAdapter(doc: Document): Promise<DocumentEditorStateAdapter> {
    if (doc.settings.editor != null) {
      const editor = await PluginManager.instance.getCustomEditorForDocument(doc);
      if (!editor) {
        return this.getDefaultEditor(doc);
      } else {
        return new editor.stateAdapter(doc);
      }
    } else {
      return this.getDefaultEditor(doc);
    }
  }


  private async getDefaultEditor(doc: Document) {
    if (isTextFile(doc.entryPath.normalized)) {
      return new (await this.loadCodeMirror()).state(doc);
    } else {
      return new (await this.loadMonaco()).state(doc);
    }
  }


  async getComponent(doc: Document): Promise<React.ComponentType<DocumentEditorProps>> {
    const editor = await PluginManager.instance.getCustomEditorForDocument(doc);
    if (editor?.component) {
      return editor.component;
    } else {
      if (isTextFile(doc.entryPath.normalized)) {
        return (await this.loadCodeMirror()).editor;
      } else {
        return (await this.loadMonaco()).editor;
      }
    }
  }


  async loadMonaco() {
    const [ editor, state ] = await Promise.all([ import("./monaco/MonacoEditor"), import("./monaco/MonacoEditorStateAdapter") ]);
    return {
      editor: editor.MonacoEditor,
      state: state.MonacoEditorStateAdapter
    };
  }


  async loadCodeMirror() {
    const [ editor, state ] = await Promise.all([ import("./code-editor/CodeEditor"), import("./code-editor/CodeEditorState") ]);
    return {
      editor: editor.CodeEditor,
      state: state.CodeEditorStateAdapter
    };
  }


  static instance = new DocumentEditorProvider();
}
