import { EditorSelection, EditorState } from "@codemirror/state";
import { history, historyKeymap } from "@codemirror/history";
import { indentOnInput } from "@codemirror/language";
import { defaultHighlightStyle, HighlightStyle } from "@codemirror/highlight";
import { bracketMatching } from "@codemirror/matchbrackets";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/closebrackets";
import { autocompletion, completionKeymap } from "@codemirror/autocomplete";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { EditorView, keymap, placeholder, scrollPastEnd, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import { createHighlightStyle } from "./Highlight";
import { FileSettings } from "../common/WorkspaceEntry";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";


function getEditorPluginForFile(fileId: string) {
  if (fileId.endsWith(".json")) {
    return json();
  } else {
    return markdown();
  }
}


export interface CreateEditorStateOptions {
  onUpdate: (upd: ViewUpdate) => void;
}


function getStoredSelectionForFile(fileId: string): EditorSelection | undefined {
  const stored = localStorage.getItem("stored-selection-" + fileId);
  if (!stored) {
    return undefined;
  }

  try {
    const range = JSON.parse(stored);
    if (typeof range.anchor === "number") {
      return range;
    } else {
      return undefined;
    }
  } catch (err) {
    return undefined;
  }
}


function storeSelectionForFile(fileId: string, selection: EditorSelection) {
  localStorage.setItem("stored-selection-" + fileId, JSON.stringify({
    anchor: selection.ranges[0]?.anchor,
    head: selection.ranges[0]?.head
  }));
}


export function createEditorState(content: string, fileId: string, settings: FileSettings, options: CreateEditorStateOptions) {
  return EditorState.create({
    doc: content,
    selection: getStoredSelectionForFile(fileId) || { anchor: 0 },
    extensions: [
      history(),
      // drawSelection(),
      // EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      defaultHighlightStyle.fallback,
      bracketMatching(),
      closeBrackets(),
      autocompletion(),
      HighlightStyle.define(createHighlightStyle(settings)),
      highlightSelectionMatches(),
      placeholder("< your note here >"),
      EditorView.lineWrapping,
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...completionKeymap,
        indentWithTab
      ]),
      getEditorPluginForFile(fileId),
      ViewPlugin.fromClass(class {
        update(upd: ViewUpdate) {
          storeSelectionForFile(fileId, upd.state.selection);
          options.onUpdate(upd);
        }
      }),
      EditorState.tabSize.of(settings.tabWidth ?? 2),
      scrollPastEnd(),
    ]
  });
}
