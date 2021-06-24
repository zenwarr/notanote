import { EditorState } from "@codemirror/state";
import { basicSetup } from "@codemirror/basic-setup";
import { json } from "@codemirror/lang-json";
import { makeObservable, observable } from "mobx";
import { ViewPlugin, ViewUpdate } from "@codemirror/view";


export class Document {
  constructor(content: string) {
    const self = this;
    this.editorState = EditorState.create({
      doc: content,
      extensions: [
        basicSetup,
        json(),
        ViewPlugin.fromClass(class {
          update(upd: ViewUpdate) {
            if (upd.docChanged) {
              self.onChanges();
            }
            self.editorState = upd.state;
          }
        })
      ]
    });
    makeObservable(this, {
      lastSave: observable,
      lastSaveError: observable,
      saveState: observable
    });
  }


  public getContents() {
    return this.editorState.doc.toString();
  }


  public onChanges() {
    if (this.saveState === SaveState.Saving) {
      this.hadChangesWhileSaving = true;
    } else {
      this.saveState = SaveState.UnsavedChanges;
    }
  }


  public onSaveStart() {
    this.saveState = SaveState.Saving;
  }


  public onSaveCompleted(error: string | undefined) {
    if (error != null) {
      this.lastSaveError = error;
      this.saveState = SaveState.UnsavedChanges;
    } else {
      this.lastSaveError = undefined;
      this.lastSave = new Date();
      this.saveState = this.hadChangesWhileSaving ? SaveState.UnsavedChanges : SaveState.NoChanges;
    }
    this.hadChangesWhileSaving = false;
  }


  editorState: EditorState;
  private hadChangesWhileSaving = false;

  lastSave: Date | undefined = undefined;
  lastSaveError: string | undefined = undefined;
  saveState: SaveState = SaveState.NoChanges;
}


export enum SaveState {
  NoChanges,
  Saving,
  UnsavedChanges
}
