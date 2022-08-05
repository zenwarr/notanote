import { Document } from "./Document";
import { makeObservable, observable } from "mobx";
import { ClientWorkspace } from "./ClientWorkspace";
import { StoragePath } from "@storage/StoragePath";
import { FileSettingsProvider } from "@common/workspace/FileSettingsProvider";
import { DocumentEditorProvider } from "./DocumentEditorProvider";


export class DocumentManager {
  readonly documents = new Map<string, { doc: Document, usageCount: number }>();


  constructor() {
    makeObservable(this, {
      documents: observable
    });
  }


  async create(path: StoragePath): Promise<Document> {
    const docInfo = this.documents.get(path.normalized);
    if (docInfo) {
      docInfo.usageCount += 1;
      return docInfo.doc;
    }

    const entry = ClientWorkspace.instance.storage.get(path);

    const document = new Document(entry, FileSettingsProvider.instance.getSettingsForPath(path));
    await document.load();
    document.setEditorStateAdapter(await DocumentEditorProvider.instance.getStateAdapter(document));
    this.documents.set(path.normalized, { doc: document, usageCount: 1 });
    return document;
  }


  close(path: StoragePath) {
    const doc = this.documents.get(path.normalized);
    if (doc) {
      doc.usageCount -= 1;
    }
  }


  static instance = new DocumentManager();
}
