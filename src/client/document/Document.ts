import { WorkspaceSettingsProvider } from "@common/workspace/WorkspaceSettingsProvider";
import * as _ from "lodash";
import { FileSettings } from "@common/Settings";
import { Workspace } from "../Workspace";
import { StorageEntryPointer } from "@storage/EntryStorage";
import { DocumentEditorProvider } from "./DocumentEditorProvider";


export interface DocumentEditorStateAdapter {
  serializeContent(): string | Buffer | Promise<string | Buffer>;
}


export class Document {
  constructor(entry: StorageEntryPointer, settings: FileSettings) {
    this.entry = entry;
    this.settings = settings;
    this.onChangesDebounced = _.debounce(this.onChangesAsync.bind(this), 500);
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
    this.onChangesDebounced()?.catch(error => console.error("onChanges failed", error))
  }


  private async onChangesAsync() {
    await this.entry.writeOrCreate(await this.contentToBuffer());
    Workspace.instance.scheduleDiffUpdate(this.entry.path);
  }


  static async create(ep: StorageEntryPointer): Promise<Document> {
    const document = new Document(ep, WorkspaceSettingsProvider.instance.getSettingsForPath(ep.path));
    const content = await ep.read();

    const editorProvider = new DocumentEditorProvider(Workspace.instance.plugins);
    document.setEditorStateAdapter(await editorProvider.getStateAdapter(document, content));
    return document;
  }


  private onChangesDebounced: () => Promise<void> | undefined;
  readonly entry: StorageEntryPointer;
  readonly settings: FileSettings;
  private adapter: DocumentEditorStateAdapter | undefined;
}
