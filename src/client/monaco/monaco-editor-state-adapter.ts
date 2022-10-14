import { Document, DocumentEditorStateAdapter } from "../document/Document";
import assert from "assert";
import * as monaco from "monaco-editor";
import { configureMonaco } from "./configure";
import { getLanguageFromFileName } from "./get-language-from-file-name";
import { getUriFromPath } from "./get-uri";


export class MonacoEditorStateAdapter implements DocumentEditorStateAdapter {
  constructor(doc: Document, initialContent: Buffer) {
    this.doc = doc;
    this.initialContent = initialContent;

    configureMonaco(); // to ensure schemas are registered

    const uri = getUriFromPath(doc.entry.path);

    const existingModel = monaco.editor.getModel(uri);
    if (existingModel) {
      this._model = existingModel;
      this._model.setValue(initialContent.toString());
    } else {
      this._model = monaco.editor.createModel(initialContent.toString(), getLanguageFromFileName(doc.entry.path.normalized), uri);
    }

    this._model.onDidChangeContent(() => this.doc.onChange());
  }


  serializeContent() {
    assert(this._model != null);
    return this._model.getValue();
  }


  onExternalChange(data: Buffer) {
    this._model?.setValue(data.toString());
  }


  get model() {
    return this._model;
  }


  get initialText(): string {
    return this.initialContent.toString();
  }


  private _model: monaco.editor.IModel | null = null;
  private readonly initialContent: Buffer;
  private readonly doc: Document;
}
