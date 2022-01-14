import { makeObservable, observable } from "mobx";
import * as luxon from "luxon";
import { Backend } from "./backend/Backend";
import { WorkspaceBackend } from "./backend/WorkspaceBackend";
import { WorkspaceManager } from "./WorkspaceManager";
import { FileSettings } from "../common/WorkspaceEntry";
import { DocumentManager } from "./DocumentManager";


const AUTO_SAVE_TIMEOUT = luxon.Duration.fromObject({ seconds: 5 });


export interface DocumentEditorStateAdapter {
  serializeContent(): string | Promise<string>;
}


export class Document {
  constructor(content: string, fileId: string, settings: FileSettings) {
    this.fileId = fileId;
    this.settings = settings;
    this.initialSerializedContent = content;

    makeObservable(this, {
      lastSave: observable,
      lastSaveError: observable,
      saveState: observable
    });
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
      return this.initialSerializedContent;
    }
  }


  onChanges() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    if (this.saveState === SaveState.Saving) {
      this.hadChangesWhileSaving = true;
    } else {
      this.saveState = SaveState.UnsavedChanges;
    }

    const doSave = () => {
      this.saveTimer = undefined;
      this.save().then(isSaved => {
        if (!isSaved) {
          this.saveTimer = setTimeout(doSave, AUTO_SAVE_TIMEOUT.as("milliseconds"));
        }
      });
    };

    this.saveTimer = setTimeout(doSave, AUTO_SAVE_TIMEOUT.as("milliseconds"));
  }


  async save(): Promise<boolean> {
    this.saveState = SaveState.Saving;

    try {
      await Backend.get(WorkspaceBackend).saveEntry(WorkspaceManager.instance.id, this.fileId, await this.serializeContent());

      this.lastSaveError = undefined;
      this.lastSave = new Date();
      this.saveState = this.hadChangesWhileSaving ? SaveState.UnsavedChanges : SaveState.NoChanges;
      DocumentManager.instance.onDocumentSaved(this);
      return true;
    } catch (err: any) {
      this.lastSaveError = err;
      this.saveState = SaveState.UnsavedChanges;

      console.error(`Failed to save document: ${ err.message }`);
      return false;
    } finally {
      this.hadChangesWhileSaving = false;
    }
  }


  private hadChangesWhileSaving = false;
  private saveTimer: any = undefined;
  readonly fileId: string;
  readonly settings: FileSettings;
  readonly initialSerializedContent: string;
  private adapter: DocumentEditorStateAdapter | undefined;

  lastSave: Date | undefined = undefined;
  lastSaveError: string | undefined = undefined;
  saveState: SaveState = SaveState.NoChanges;
}


export enum SaveState {
  NoChanges,
  Saving,
  UnsavedChanges
}
