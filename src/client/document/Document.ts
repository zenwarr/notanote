import { WorkspaceSettingsProvider } from "@storage/workspace-settings-provider";
import { Mutex } from "async-mutex";
import * as _ from "lodash";
import { FileSettings } from "@common/Settings";
import { Workspace } from "../workspace/workspace";
import { StorageEntryPointer } from "@storage/entry-storage";
import { DocumentEditorProvider } from "./DocumentEditorProvider";


export interface DocumentEditorStateAdapter {
  serializeContent(): string | Buffer | Promise<string | Buffer>;
}


export class Document {
  constructor(entry: StorageEntryPointer, settings: FileSettings) {
    this.entry = entry;
    this.settings = settings;
    this.onChangesDebounced = _.debounce(this.save.bind(this), 500);
  }


  async close() {
    const release = await Document.docsLock.acquire();

    try {
      await this.save();
      Document.docs.delete(this.entry.path.normalized);
    } finally {
      release();
    }
  }


  setEditorStateAdapter(adapter: DocumentEditorStateAdapter) {
    this.adapter = adapter;
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


  onChanges() {
    this.onChangesDebounced()?.catch(error => console.error("onChanges failed", error));
  }


  private async save() {
    await this.entry.writeOrCreate(await this.contentToBuffer());
    Workspace.instance.scheduleDiffUpdate(this.entry.path);
  }


  static async create(ep: StorageEntryPointer): Promise<Document> {
    const release = await this.docsLock.acquire();

    try {
      const document = new Document(ep, WorkspaceSettingsProvider.instance.getSettingsForPath(ep.path));
      const content = await ep.read();

      const editorProvider = new DocumentEditorProvider(Workspace.instance.plugins);
      document.setEditorStateAdapter(await editorProvider.getStateAdapter(document, content));

      this.docs.set(ep.path.normalized, document);

      return document;
    } finally {
      release();
    }
  }


  private onChangesDebounced: () => Promise<void> | undefined;
  readonly entry: StorageEntryPointer;
  readonly settings: FileSettings;
  private adapter: DocumentEditorStateAdapter | undefined;
  private static docs = new Map<string, Document>();
  private static docsLock = new Mutex();
}
