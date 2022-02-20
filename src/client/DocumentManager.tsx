import { Document, DocumentEditorStateAdapter, SaveState } from "./Document";
import { computed, makeObservable, observable } from "mobx";
import { ClientWorkspace } from "./ClientWorkspace";
import { SpecialFiles } from "../common/SpecialFiles";
import { PluginManager } from "./plugin/PluginManager";
import { StoragePath } from "../common/storage/StoragePath";
import { FileSettingsProvider } from "../common/workspace/FileSettingsProvider";
import { CodeEditorStateAdapter } from "./code-editor/CodeEditorState";
import { DocumentEditorProvider } from "./DocumentEditorProvider";


export class DocumentManager {
  readonly documents = new Map<string, { doc: Document, usageCount: number }>();


  constructor() {
    makeObservable(this, {
      documents: observable,
      hasUnsavedChanges: computed
    });
  }


  async create(path: StoragePath): Promise<Document> {
    const docInfo = this.documents.get(path.normalized);
    if (docInfo) {
      docInfo.usageCount += 1;
      return docInfo.doc;
    }

    const entry = ClientWorkspace.instance.storage.get(path);
    const content = await entry.readText();

    const document = new Document(content, path, FileSettingsProvider.instance.getSettingsForPath(path));
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


  get hasUnsavedChanges(): boolean {
    for (const doc of this.documents.values()) {
      if (doc.doc.saveState !== SaveState.NoChanges) {
        return true;
      }
    }

    return false;
  }


  public onDocumentSaved(doc: Document) {
    if (SpecialFiles.shouldReloadSettingsAfterSave(doc.entryPath)) {
      for (const [ key, value ] of this.documents) {
        if (value.usageCount === 0) {
          this.documents.delete(key);
        }
      }
    }
  }


  static instance = new DocumentManager();
}
