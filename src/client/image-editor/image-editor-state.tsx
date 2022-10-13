import { DocumentEditorStateAdapter } from "../document/Document";
import * as mobx from "mobx";
import { Document } from "../document/Document";


export class ImageEditorStateAdapter implements DocumentEditorStateAdapter {
  constructor(doc: Document, initialContent: Buffer) {
    // create object url from buffer
    this.objectUrl = URL.createObjectURL(new Blob([ initialContent ]));
    this.initialContent = initialContent;
    mobx.makeObservable(this, {
      objectUrl: mobx.observable.ref,
    });
  }


  readonly objectUrl: string;
  private readonly initialContent: Buffer;


  serializeContent() {
    return this.initialContent;
  }
}
