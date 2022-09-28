import * as _ from "lodash";
import { FileSettings } from "@common/Settings";
import { ClientWorkspace } from "./ClientWorkspace";
import { StorageEntryPointer } from "@storage/EntryStorage";


export interface DocumentEditorStateAdapter {
  serializeContent(): string | Buffer | Promise<string | Buffer>;
}


export class Document {
  constructor(entry: StorageEntryPointer, settings: FileSettings) {
    this.entry = entry;
    this.settings = settings;
    this.content = Buffer.alloc(0);
    this.onChangesDebounced = _.debounce(this.onChangesAsync.bind(this), 500);
  }


  async load(): Promise<void> {
    this.content = await this.entry.read();
  }


  setEditorStateAdapter(adapter: DocumentEditorStateAdapter) {
    this.adapter = adapter;
  }


  getEditorStateAdapter() {
    return this.adapter;
  }


  async contentToBuffer(): Promise<Buffer> {
    if (this.adapter) {
      const adapterData = await this.adapter.serializeContent();
      return typeof adapterData === "string" ? Buffer.from(adapterData) : adapterData;
    } else {
      return this.content;
    }
  }


  getLastSavedData() {
    return this.content;
  }


  onChanges() {
    this.onChangesDebounced()?.catch(error => console.error("onChanges failed", error))
  }


  private async onChangesAsync() {
    await this.entry.writeOrCreate(await this.contentToBuffer());
    await ClientWorkspace.instance.syncWorker?.updateDiff(this.entry.path);
  }


  private onChangesDebounced: () => Promise<void> | undefined;
  readonly entry: StorageEntryPointer;
  readonly settings: FileSettings;
  private content: Buffer;
  private adapter: DocumentEditorStateAdapter | undefined;
}
