import { DocumentEditorStateAdapter } from "./document";
import { Document } from "./document";


export class ReadonlyStateAdapter implements DocumentEditorStateAdapter {
  constructor(doc: Document, initialContent: Buffer) {
    this.initialContent = initialContent;
  }


  private readonly initialContent: Buffer;


  serializeContent(): Buffer {
    return this.initialContent;
  }
}
