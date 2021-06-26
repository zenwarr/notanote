import { EditorState } from "@codemirror/state";
import { history, historyKeymap } from "@codemirror/history";
import { makeObservable, observable } from "mobx";
import { drawSelection, EditorView, keymap, placeholder, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { indentOnInput } from "@codemirror/language";
import { defaultHighlightStyle } from "@codemirror/highlight";
import { bracketMatching } from "@codemirror/matchbrackets";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/closebrackets";
import { autocompletion, completionKeymap } from "@codemirror/autocomplete";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { defaultKeymap, defaultTabBinding } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import * as luxon from "luxon";
import { Backend } from "./backend/Backend";
import { WorkspaceBackend } from "./backend/WorkspaceBackend";
import { WorkspaceManager } from "./WorkspaceManager";


const AUTO_SAVE_TIMEOUT = luxon.Duration.fromObject({ second: 5 });


export class Document {
  constructor(content: string, fileId: string) {
    this.fileId = fileId;

    makeObservable(this, {
      lastSave: observable,
      lastSaveError: observable,
      saveState: observable
    });

    const self = this;
    this.editorState = EditorState.create({
      doc: content,
      extensions: [
        history(),
        // drawSelection(),
        // EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        defaultHighlightStyle.fallback,
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        highlightSelectionMatches(),
        placeholder("< your note here >"),
        EditorView.lineWrapping,
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...completionKeymap,
          defaultTabBinding
        ]),
        markdown(),
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

    this.saveTimer = setTimeout(() => {
      this.saveTimer = undefined;
      this.save().catch(err => {
        console.error("failed to save document", err);
      });
    }, AUTO_SAVE_TIMEOUT.as("millisecond"));
  }


  async save() {
    this.saveState = SaveState.Saving;

    try {
      await Backend.get(WorkspaceBackend).saveEntry(WorkspaceManager.instance.id, this.fileId, this.getContents());

      this.lastSaveError = undefined;
      this.lastSave = new Date();
      this.saveState = this.hadChangesWhileSaving ? SaveState.UnsavedChanges : SaveState.NoChanges;
    } catch (err) {
      this.lastSaveError = err;
      this.saveState = SaveState.UnsavedChanges;

      alert("Failed to save document: " + err.message);
    } finally {
      this.hadChangesWhileSaving = false;
    }
  }


  editorState: EditorState;
  private hadChangesWhileSaving = false;
  private saveTimer: any = undefined;
  readonly fileId: string;

  lastSave: Date | undefined = undefined;
  lastSaveError: string | undefined = undefined;
  saveState: SaveState = SaveState.NoChanges;
}


export enum SaveState {
  NoChanges,
  Saving,
  UnsavedChanges
}
