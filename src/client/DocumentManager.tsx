import { Document, SaveState } from "./Document";
import { computed, makeObservable, observable } from "mobx";
import { WorkspaceBackend } from "./backend/WorkspaceBackend";
import { Backend } from "./backend/Backend";
import { WorkspaceManager } from "./WorkspaceManager";
import { SpecialFiles } from "../common/SpecialFiles";


export class DocumentManager {
  readonly documents = new Map<string, { doc: Document, usageCount: number }>();


  constructor() {
    makeObservable(this, {
      documents: observable,
      hasUnsavedChanges: computed
    });
  }


  async create(fileId: string): Promise<Document> {
    const docInfo = this.documents.get(fileId);
    if (docInfo) {
      docInfo.usageCount += 1;
      return docInfo.doc;
    }

    const entryInfo = await Backend.get(WorkspaceBackend).getEntry(WorkspaceManager.instance.id, fileId);

    const document = new Document(entryInfo.content, fileId, entryInfo.settings);
    this.documents.set(fileId, { doc: document, usageCount: 1 });
    return document;
  }


  close(fileID: string) {
    const doc = this.documents.get(fileID);
    if (doc) {
      doc.usageCount -= 1;
    }
  }


  get hasUnsavedChanges(): boolean {
    for (const doc of this.documents.values()) {
      if (doc.doc.saveState !== SaveState.NoChanges) {
        return true;
      }
    }

    return false;
  }


  public onDocumentSaved(doc: Document) {
    if (SpecialFiles.shouldReloadSettingsAfterSave(doc.fileId)) {
      for (const [ key, value ] of this.documents) {
        if (value.usageCount === 0) {
          this.documents.delete(key);
        }
      }
    }
  }


  static instance = new DocumentManager();
}
