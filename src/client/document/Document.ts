import { SpecialPath } from "@storage/special-path";
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


export type DocumentEditorStateAdapterConstructor = new(doc: Document, initialContent: Buffer, settings: FileSettings) => DocumentEditorStateAdapter;


export class Document {
  constructor(entry: StorageEntryPointer) {
    this.entry = entry;
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
    let buf = await this.contentToBuffer();
    await this.entry.writeOrCreate(buf);
    Workspace.instance.scheduleDiffUpdate(this.entry.path);

    if (this.entry.path.isEqual(SpecialPath.Settings)) {
      await WorkspaceSettingsProvider.instance.reload(buf);
    }
  }


  static async create(ep: StorageEntryPointer): Promise<Document> {
    const release = await this.docsLock.acquire();

    try {
      const document = new Document(ep);
      const content = await ep.read();

      const editorProvider = new DocumentEditorProvider(Workspace.instance.plugins);
      const settings = WorkspaceSettingsProvider.instance.getSettingsForPath(ep.path);
      document.setEditorStateAdapter(await editorProvider.getStateAdapter(document,  content, settings.editor));

      this.docs.set(ep.path.normalized, document);

      return document;
    } finally {
      release();
    }
  }


  private onChangesDebounced: () => Promise<void> | undefined;
  readonly entry: StorageEntryPointer;
  private adapter: DocumentEditorStateAdapter | undefined;
  private static docs = new Map<string, Document>();
  private static docsLock = new Mutex();
}
