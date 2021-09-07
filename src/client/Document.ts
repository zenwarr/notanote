import { EditorState } from "@codemirror/state";
import { makeObservable, observable } from "mobx";
import * as luxon from "luxon";
import { Backend } from "./backend/Backend";
import { WorkspaceBackend } from "./backend/WorkspaceBackend";
import { WorkspaceManager } from "./WorkspaceManager";
import { FileSettings } from "../common/WorkspaceEntry";
import { createEditorState } from "./EditorState";
import { DocumentManager } from "./DocumentManager";


const AUTO_SAVE_TIMEOUT = luxon.Duration.fromObject({ seconds: 5 });


export class Document {
  constructor(content: string, fileId: string, settings: FileSettings) {
    this.fileId = fileId;
    this.settings = settings;

    makeObservable(this, {
      lastSave: observable,
      lastSaveError: observable,
      saveState: observable
    });

    const self = this;
    this.editorState = createEditorState(content, fileId, settings, {
      onUpdate: upd => {
        if (upd.docChanged) {
          self.onChanges();
        }
        self.editorState = upd.state;
      }
    });
  }


  getContents() {
    return this.editorState.doc.toString();
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
      await Backend.get(WorkspaceBackend).saveEntry(WorkspaceManager.instance.id, this.fileId, this.getContents());

      this.lastSaveError = undefined;
      this.lastSave = new Date();
      this.saveState = this.hadChangesWhileSaving ? SaveState.UnsavedChanges : SaveState.NoChanges;
      DocumentManager.instance.onDocumentSaved(this);
      return true;
    } catch (err) {
      this.lastSaveError = err;
      this.saveState = SaveState.UnsavedChanges;

      console.error(`Failed to save document: ${ err.message }`);
      return false;
    } finally {
      this.hadChangesWhileSaving = false;
    }
  }


  editorState: EditorState;
  private hadChangesWhileSaving = false;
  private saveTimer: any = undefined;
  readonly fileId: string;
  readonly settings: FileSettings;

  lastSave: Date | undefined = undefined;
  lastSaveError: string | undefined = undefined;
  saveState: SaveState = SaveState.NoChanges;
}


export enum SaveState {
  NoChanges,
  Saving,
  UnsavedChanges
}
