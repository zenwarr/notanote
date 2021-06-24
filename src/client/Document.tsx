import { EditorState } from "@codemirror/state";
import { json } from "@codemirror/lang-json";
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


export class Document {
  constructor(content: string) {
    const self = this;
    this.editorState = EditorState.create({
      doc: content,
      extensions: [
        history(),
        drawSelection(),
        EditorState.allowMultipleSelections.of(true),
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
