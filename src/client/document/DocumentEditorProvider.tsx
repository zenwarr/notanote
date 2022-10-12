import * as React from "react";
import { Document, DocumentEditorStateAdapter } from "./Document";
import { PluginManager } from "../plugin/plugin-manager";
import { ReadonlyStateAdapter } from "./ReadonlyStateAdapter";


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
  state: new (doc: Document, initialContent: Buffer) => DocumentEditorStateAdapter;
}


export class DocumentEditorProvider {
  constructor(plugins: PluginManager) {
    this.plugins = plugins;
  }


  private readonly plugins: PluginManager;


  async getStateAdapter(doc: Document, initialContent: Buffer): Promise<DocumentEditorStateAdapter> {
    let StateClass: new (doc: Document, initialContent: Buffer) => DocumentEditorStateAdapter;

    if (doc.settings.editor != null) {
      const editor = await this.plugins.getCustomEditorForDocument(doc);
      if (!editor) {
        StateClass = (await this.getDefault(doc)).state;
      } else {
        StateClass = editor.stateAdapter || ReadonlyStateAdapter;
      }
    } else {
      StateClass = (await this.getDefault(doc)).state;
    }

    return new StateClass(doc, initialContent);
  }


  async getComponent(doc: Document): Promise<React.ComponentType<DocumentEditorProps>> {
    const editor = await this.plugins.getCustomEditorForDocument(doc);
    if (editor?.component) {
      return editor.component;
    } else {
      return (await this.getDefault(doc)).editor;
    }
  }


  private async getDefault(doc: Document) {
    if (shouldUseCodeMirror(doc.entry.path.normalized)) {
      return this.loadCodeMirror();
    } else {
      return this.loadMonaco();
    }
  }


  async loadMonaco(): Promise<LazyEditorModule> {
    const [ editor, state ] = await Promise.all([ import("../monaco/monaco-editor"), import("../monaco/monaco-editor-state-adapter") ]);
    return {
      editor: editor.MonacoEditor,
      state: state.MonacoEditorStateAdapter
    };
  }


  async loadCodeMirror(): Promise<LazyEditorModule> {
    const [ editor, state ] = await Promise.all([ import("../code-editor/CodeEditor"), import("../code-editor/CodeEditorState") ]);
    return {
      editor: editor.CodeEditor,
      state: state.CodeEditorStateAdapter
    };
  }
}


function isAndroidOrIOS() {
  return /(android|ios)/i.test(navigator.userAgent);
}
