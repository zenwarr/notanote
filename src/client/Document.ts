import { EditorState } from "@codemirror/state";
import { history, historyKeymap } from "@codemirror/history";
import { makeObservable, observable } from "mobx";
import { EditorView, keymap, placeholder, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { indentOnInput } from "@codemirror/language";
import { defaultHighlightStyle, HighlightStyle, tags } from "@codemirror/highlight";
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
import { json } from "@codemirror/lang-json";
import { FileSettings } from "../common/WorkspaceEntry";


const AUTO_SAVE_TIMEOUT = luxon.Duration.fromObject({ second: 5 });


function getEditorPluginForFile(fileId: string) {
  if (fileId.endsWith(".json")) {
    return json();
  } else {
    return markdown();
  }
}


export class Document {
  constructor(content: string, fileId: string, settings: FileSettings) {
    this.fileId = fileId;
    this.settings = settings;

    makeObservable(this, {
      lastSave: observable,
      lastSaveError: observable,
      saveState: observable
    });

    const highlightStyle = HighlightStyle.define([
      { tag: tags.monospace, fontFamily: "Cascadia Code", lineSpacing: 1.3 }
    ]);

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
        highlightStyle,
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
        getEditorPluginForFile(fileId),
        ViewPlugin.fromClass(class {
          update(upd: ViewUpdate) {
            if (upd.docChanged) {
              self.onChanges();
            }
            self.editorState = upd.state;
          }
        }),
        EditorState.tabSize.of(settings.tabWidth ?? 2),
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

    const doSave = () => {
      this.saveTimer = undefined;
      this.save().then(isSaved => {
        if (!isSaved) {
          this.saveTimer = setTimeout(doSave, AUTO_SAVE_TIMEOUT.as("millisecond"));
        }
      });
    };

    this.saveTimer = setTimeout(doSave, AUTO_SAVE_TIMEOUT.as("millisecond"));
  }


  async save(): Promise<boolean> {
    this.saveState = SaveState.Saving;

    try {
      await Backend.get(WorkspaceBackend).saveEntry(WorkspaceManager.instance.id, this.fileId, this.getContents());

      this.lastSaveError = undefined;
      this.lastSave = new Date();
      this.saveState = this.hadChangesWhileSaving ? SaveState.UnsavedChanges : SaveState.NoChanges;
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
