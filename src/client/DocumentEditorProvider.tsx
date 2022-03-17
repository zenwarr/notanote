import * as React from "react";
import { PluginManager } from "./plugin/PluginManager";
import { Document, DocumentEditorStateAdapter } from "./Document";


const TEXT_EXTS = [ ".md", ".txt" ];


function shouldUseCodeMirror(filename: string): boolean {
  if (isAndroidOrIOS()) {
    // monaco-editor doesn't support Android or iOS
    return true;
  }

  const ext = filename.slice(filename.lastIndexOf("."));
  return TEXT_EXTS.indexOf(ext) >= 0;
}


export interface DocumentEditorProps {
  doc: Document;
}


interface LazyEditorModule {
  editor: React.ComponentType<DocumentEditorProps>;
  state: new (doc: Document) => DocumentEditorStateAdapter;
}


export class DocumentEditorProvider {
  async getStateAdapter(doc: Document): Promise<DocumentEditorStateAdapter> {
    let StateClass: new (doc: Document) => DocumentEditorStateAdapter;

    if (doc.settings.editor != null) {
      const editor = await PluginManager.instance.getCustomEditorForDocument(doc);
      if (!editor) {
        StateClass = (await this.getDefault(doc)).state;
      } else {
        StateClass = editor.stateAdapter;
      }
    } else {
      StateClass = (await this.getDefault(doc)).state;
    }

    return new StateClass(doc);
  }


  async getComponent(doc: Document): Promise<React.ComponentType<DocumentEditorProps>> {
    const editor = await PluginManager.instance.getCustomEditorForDocument(doc);
    if (editor?.component) {
      return editor.component;
    } else {
      return (await this.getDefault(doc)).editor;
    }
  }


  private async getDefault(doc: Document) {
    // if (doc.entryPath.normalized.endsWith(".md")) {
    //   return this.loadProseMirror();
    if (shouldUseCodeMirror(doc.entryPath.normalized)) {
      return this.loadCodeMirror();
    } else {
      return this.loadMonaco();
    }
  }


  async loadMonaco(): Promise<LazyEditorModule> {
    const [ editor, state ] = await Promise.all([ import("./monaco/MonacoEditor"), import("./monaco/MonacoEditorStateAdapter") ]);
    return {
      editor: editor.MonacoEditor,
      state: state.MonacoEditorStateAdapter
    };
  }


  async loadCodeMirror(): Promise<LazyEditorModule> {
    const [ editor, state ] = await Promise.all([ import("./code-editor/CodeEditor"), import("./code-editor/CodeEditorState") ]);
    return {
      editor: editor.CodeEditor,
      state: state.CodeEditorStateAdapter
    };
  }


  // async loadProseMirror(): Promise<LazyEditorModule> {
  //   const [ editor, state ] = await Promise.all([ import("./prose-editor/ProseEditor"), import("./prose-editor/ProseEditorStateAdapter") ]);
  //   return {
  //     editor: editor.ProseEditor,
  //     state: state.ProseEditorStateAdapter
  //   };
  // }


  static instance = new DocumentEditorProvider();
}


function isAndroidOrIOS() {
  return /(android|ios)/i.test(navigator.userAgent);
}
