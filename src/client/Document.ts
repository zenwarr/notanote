import { makeObservable, observable } from "mobx";
import { FileSettings } from "../common/Settings";
import { ClientWorkspace } from "./ClientWorkspace";
import { DocumentManager } from "./DocumentManager";
import { StorageEntryPointer } from "../common/storage/StorageLayer";
import assert from "assert";


export interface DocumentEditorStateAdapter {
  serializeContent(): string | Promise<string>;
}


export class Document {
  constructor(entry: StorageEntryPointer, settings: FileSettings) {
    this.entry = entry;
    this.settings = settings;
    this.text = "";
  }


  async loadText() {
    this.text = await this.entry.readText();
  }


  setEditorStateAdapter(adapter: DocumentEditorStateAdapter) {
    this.adapter = adapter;
  }


  getEditorStateAdapter() {
    return this.adapter;
  }


  serializeContent(): string | Promise<string> {
    if (this.adapter) {
      return this.adapter.serializeContent();
    } else {
      return this.text;
    }
  }


  getLastSavedText() {
    return this.text;
  }


  onChanges() {
    this.onChangesAsync().catch(error => console.error("onChanges failed", error))
  }


  private async onChangesAsync() {
    await this.entry.writeOrCreate(await this.serializeContent());
    ClientWorkspace.instance.syncWorker.addRoot(this.entry);
  }


  readonly entry: StorageEntryPointer;
  readonly settings: FileSettings;
  private text: string;
  private adapter: DocumentEditorStateAdapter | undefined;
}
