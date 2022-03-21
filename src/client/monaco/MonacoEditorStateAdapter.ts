import { Document, DocumentEditorStateAdapter } from "../Document";
import * as monaco from "monaco-editor";
import assert from "assert";


export class MonacoEditorStateAdapter implements DocumentEditorStateAdapter {
  constructor(doc: Document) {
    this.doc = doc;
  }


  serializeContent() {
    assert(this._model != null);
    return this._model.getValue();
  }


  set model(model: monaco.editor.IModel | null) {
    this._model = model || null;
    this._model?.onDidChangeContent(() => this.doc.onChanges());
  }


  get initialText() {
    return this.doc.getLastSavedText();
  }


  private _model: monaco.editor.IModel | null = null;
  private readonly doc: Document;
}
