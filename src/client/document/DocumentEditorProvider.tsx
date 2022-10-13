import { StoragePath } from "@storage/storage-path";
import { WorkspaceSettingsProvider } from "@storage/workspace-settings-provider";
import * as React from "react";
import { getPlatform, Platform } from "../platform/get-platform";
import { PluginManager } from "../plugin/plugin-manager";
import { Document, DocumentEditorStateAdapter, DocumentEditorStateAdapterConstructor } from "./Document";
import { ReadonlyStateAdapter } from "./ReadonlyStateAdapter";


const CM_EXTS = [ ".md", ".txt" ];
const IMAGE_EXTS = [ ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".ico" ];


function shouldUseCodeMirror(filename: StoragePath): boolean {
  if (isMobile()) {
    // monaco-editor doesn't support Android or iOS
    return true;
  }

  const ext = filename.extension;
  return ext != null && CM_EXTS.includes(ext);
}


export interface DocumentEditorProps {
  doc: Document;
  className?: string;
}


interface LazyEditorModule {
  editor: React.ComponentType<DocumentEditorProps>;
  state: DocumentEditorStateAdapterConstructor;
}


export class DocumentEditorProvider {
  constructor(plugins: PluginManager) {
    this.plugins = plugins;
  }


  private readonly plugins: PluginManager;


  async getStateAdapter(doc: Document, initialContent: Buffer, editorSpec: string | undefined): Promise<DocumentEditorStateAdapter> {
    let StateClass: DocumentEditorStateAdapterConstructor;

    if (editorSpec != null) {
      const editor = await this.plugins.getCustomEditor(editorSpec);
      if (!editor) {
        StateClass = (await this.getDefault(doc.entry.path)).state;
      } else {
        StateClass = editor.stateAdapter || ReadonlyStateAdapter;
      }
    } else {
      StateClass = (await this.getDefault(doc.entry.path)).state;
    }

    const settings = WorkspaceSettingsProvider.instance.getSettingsForPath(doc.entry.path);

    return new StateClass(doc, initialContent, settings);
  }


  async getComponent(path: StoragePath, editorSpec: string | undefined): Promise<React.ComponentType<DocumentEditorProps>> {
    const editor = await this.plugins.getCustomEditor(editorSpec);
    if (editor?.component) {
      return editor.component;
    } else {
      return (await this.getDefault(path)).editor;
    }
  }


  private async getDefault(path: StoragePath) {
    const ext = path.extension;
    if (ext && IMAGE_EXTS.includes(ext)) {
      return this.loadImageEditor();
    } else if (shouldUseCodeMirror(path)) {
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
    const [ editor, state ] = await Promise.all([ import("../code-editor/code-editor"), import("../code-editor/code-editor-state") ]);
    return {
      editor: editor.CodeEditor,
      state: state.CodeEditorStateAdapter
    };
  }


  async loadImageEditor(): Promise<LazyEditorModule> {
    const [ editor, state ] = await Promise.all([ import("../image-editor/image-editor"), import("../image-editor/image-editor-state") ]);
    return {
      editor: editor.ImageEditor,
      state: state.ImageEditorStateAdapter
    };
  }
}


function isMobile() {
  return /(android|ios)/i.test(navigator.userAgent) || getPlatform() === Platform.Android || getPlatform() === Platform.Ios;
}
