import { Document, DocumentEditorStateAdapter, SaveState } from "./Document";
import { computed, makeObservable, observable } from "mobx";
import { ClientWorkspace } from "./ClientWorkspace";
import { SpecialFiles } from "../common/SpecialFiles";
import { CmDocumentEditorStateAdapter } from "./EditorState";
import { PluginManager } from "./plugin/PluginManager";
import { StoragePath } from "../common/storage/StoragePath";
import { FileSettingsProvider } from "../common/workspace/FileSettingsProvider";


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

    console.log("reading document text", path.normalized);
    const entry = ClientWorkspace.instance.storage.get(path);
    const content = await entry.readText();

    const document = new Document(content, path, FileSettingsProvider.instance.getSettingsForPath(path));
    document.setEditorStateAdapter(await this.getStateAdapterForFile(document));
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


  private async getStateAdapterForFile(doc: Document): Promise<DocumentEditorStateAdapter> {
    if (doc.settings.editor != null) {
      const editor = await PluginManager.instance.getCustomEditorForDocument(doc);
      if (!editor) {
        return new CmDocumentEditorStateAdapter(doc);
      } else {
        return new editor.stateAdapter(doc);
      }
    } else {
      return new CmDocumentEditorStateAdapter(doc);
    }
  }


  static instance = new DocumentManager();
}
