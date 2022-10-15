import { SpecialPath } from "@storage/special-path";
import { StoragePath } from "@storage/storage-path";
import { WorkspaceSettingsProvider } from "@storage/workspace-settings-provider";
import { ContentIdentity, getContentIdentity, getContentIdentityForData } from "@sync/content-identity";
import { Mutex } from "async-mutex";
import * as _ from "lodash";
import * as mobx from "mobx";
import { FileSettings } from "@common/settings";
import { Workspace } from "../workspace/workspace";
import { StorageEntryPointer } from "@storage/entry-storage";
import { DocumentEditorProvider } from "./document-editor-provider";


export interface DocumentEditorStateAdapter {
  serializeContent(): string | Buffer | Promise<string | Buffer>;

  onExternalChange?(data: Buffer): void;
}


export type DocumentEditorStateAdapterConstructor = new(doc: Document, initialContent: Buffer, settings: FileSettings) => DocumentEditorStateAdapter;


export class Document {
  constructor(entry: StorageEntryPointer, initialData: Buffer) {
    this.entry = entry;
    this.onChangeDebounced = _.debounce(this.save.bind(this), 500);
    this.lastSavedIdentity = getContentIdentityForData(initialData);
    mobx.makeObservable(this, {
      updatedExternally: mobx.observable,
      removedExternally: mobx.observable,
      justDeleted: mobx.observable
    });
  }


  async close(save = true) {
    const release = await Document.docsLock.acquire();

    try {
      if (save) {
        await this.save();
      }

      Document.docs.delete(this.entry.path.normalized);
    } finally {
      release();
    }
  }


  getEditorStateAdapter() {
    return this.adapter;
  }


  async contentToBuffer(): Promise<Buffer> {
    if (!this.adapter) {
      throw new Error("Invariant error: state adapter was not property initialized");
    }

    const adapterData = await this.adapter.serializeContent();
    return typeof adapterData === "string" ? Buffer.from(adapterData) : adapterData;
  }


  onChange() {
    ++this.unsavedChangesCounter;
    this.onChangeDebounced()?.catch(error => console.error("onChange failed", error));
  }


  async save(force = false) {
    if (this.justDeleted) {
      return;
    }

    if (!force && (this.removedExternally || this.updatedExternally || this.unsavedChangesCounter === 0)) {
      return;
    }

    const prevSavedIdentity = this.lastSavedIdentity;

    const release = await this.saveLock.acquire();
    try {
      const prevUnsavedChanges = this.unsavedChangesCounter;

      let buf = await this.contentToBuffer();
      this.lastSavedIdentity = getContentIdentityForData(buf);
      await this.entry.writeOrCreate(buf);
      Workspace.instance.scheduleDiffUpdate(this.entry.path);

      if (this.entry.path.isEqual(SpecialPath.Settings)) {
        await WorkspaceSettingsProvider.instance.reload(buf);
      }

      this.unsavedChangesCounter -= prevUnsavedChanges;

      if (force) {
        this.removedExternally = false;
        this.updatedExternally = false;
      }
    } catch (err) {
      this.lastSavedIdentity = prevSavedIdentity;
      throw err;
    } finally {
      release();
    }
  }


  async reload() {
    this.adapter?.onExternalChange?.(await this.entry.read());
  }


  static async create(ep: StorageEntryPointer): Promise<Document> {
    const release = await this.docsLock.acquire();

    try {
      const content = await ep.read();
      const document = new Document(ep, content);

      const editorProvider = new DocumentEditorProvider(Workspace.instance.plugins);
      const settings = WorkspaceSettingsProvider.instance.getSettingsForPath(ep.path);
      document.adapter = await editorProvider.getStateAdapter(document, content, settings.editor);

      this.docs.set(ep.path.normalized, document);

      return document;
    } finally {
      release();
    }
  }


  /**
   * This method should only be called by Workspace before entries are deleted.
   * Returns false if the document has unsaved changes and user should be prompted to save it
   */
  static async onRemove(path: StoragePath): Promise<boolean> {
    const release = await this.docsLock.acquire();
    try {
      for (const doc of this.docs.values()) {
        const docPath = doc.entry.path;
        if (docPath.inside(path)) {
          if (doc.unsavedChangesCounter) {
            doc.removedExternally = true;
            return false;
          } else {
            doc.justDeleted = true;
          }
        }
      }
    } finally {
      release();
    }

    return true;
  }


  static async onUpdate(path: StoragePath, contentIdentity: ContentIdentity | undefined, content: Buffer | undefined) {
    const release = await this.docsLock.acquire();
    try {
      for (const doc of this.docs.values()) {
        const docPath = doc.entry.path;
        if (docPath.isEqual(path)) {
          if (doc.unsavedChangesCounter || !doc.adapter?.onExternalChange) {
            doc.updatedExternally = true;
          } else {
            doc.adapter?.onExternalChange?.(content || await doc.entry.read());
          }
        }
      }
    } finally {
      release();
    }
  }


  private onChangeDebounced: () => Promise<void> | undefined;
  readonly entry: StorageEntryPointer;

  /**
   * This property is set to true when a file is intentionally deleted by user.
   * This document should be closed immediately, but we should prevent saving the document after that.
   * A document is not going to be automatically saved on close in this case.
   */
  justDeleted = false;
  updatedExternally = false;
  removedExternally = false;
  private lastSavedIdentity: string | undefined;
  private unsavedChangesCounter = 0;
  private saveLock = new Mutex();

  private adapter: DocumentEditorStateAdapter | undefined;
  private static docs = new Map<string, Document>();
  private static docsLock = new Mutex();
}
