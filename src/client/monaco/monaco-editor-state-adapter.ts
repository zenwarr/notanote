import { Document, DocumentEditorStateAdapter } from "../document/Document";
import * as monaco from "monaco-editor";
import assert from "assert";


export class MonacoEditorStateAdapter implements DocumentEditorStateAdapter {
  constructor(doc: Document, initialContent: Buffer) {
    this.doc = doc;
    this.initialContent = initialContent;
  }


  serializeContent() {
    assert(this._model != null);
    return this._model.getValue();
  }


  set model(model: monaco.editor.IModel | null) {
    this._model = model || null;
    this._model?.onDidChangeContent(() => this.doc.onChanges());
  }


  get initialText(): string {
    return this.initialContent.toString();
  }


  private _model: monaco.editor.IModel | null = null;
  private readonly initialContent: Buffer;
  private readonly doc: Document;
}
