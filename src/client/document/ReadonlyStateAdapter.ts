import { DocumentEditorStateAdapter } from "./Document";
import { Document } from "./Document";


export class ReadonlyStateAdapter implements DocumentEditorStateAdapter {
  constructor(doc: Document, initialContent: Buffer) {
    this.initialContent = initialContent;
  }


  private readonly initialContent: Buffer;


  serializeContent(): Buffer {
    return this.initialContent;
  }
}
