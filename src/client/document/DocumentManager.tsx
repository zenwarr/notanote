import { Document } from "./Document";
import { makeObservable, observable } from "mobx";
import { Workspace } from "../Workspace";
import { StoragePath } from "@storage/StoragePath";
import { WorkspaceSettingsProvider } from "@common/workspace/WorkspaceSettingsProvider";
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

    const entry = Workspace.instance.storage.get(path);

    const document = new Document(entry, WorkspaceSettingsProvider.instance.getSettingsForPath(path));
    const content = await entry.read();

    const editorProvider = new DocumentEditorProvider(Workspace.instance.plugins);
    document.setEditorStateAdapter(await editorProvider.getStateAdapter(document, content));
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
