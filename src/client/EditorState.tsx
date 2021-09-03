import { EditorSelection, EditorState } from "@codemirror/state";
import { history, historyKeymap } from "@codemirror/history";
import { indentOnInput, syntaxTree } from "@codemirror/language";
import { defaultHighlightStyle, HighlightStyle } from "@codemirror/highlight";
import { bracketMatching } from "@codemirror/matchbrackets";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/closebrackets";
import { autocompletion, completionKeymap } from "@codemirror/autocomplete";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import {
  Decoration,
  EditorView,
  keymap,
  placeholder,
  scrollPastEnd,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
  Range,
  DecorationSet
} from "@codemirror/view";
import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import { createHighlightStyle } from "./Highlight";
import { FileSettings } from "../common/WorkspaceEntry";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import * as ReactDOM from "react-dom";
import { ReactElement } from "react";
import { Checkbox } from "@material-ui/core";


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


abstract class ReactWidget<StateType> extends WidgetType {
  constructor(private readonly state: StateType) {
    super();
  }


  eq(other: ReactWidget<StateType>): boolean {
    return this.state === other.state;
  }


  toDOM(view: EditorView) {
    let wrapper = document.createElement("span");
    ReactDOM.render(this.render(this.state, view), wrapper);
    return wrapper;
  }


  abstract render(props: StateType, view: EditorView): ReactElement;
}


class CheckboxWidget extends ReactWidget<boolean> {
  render(props: boolean, view: EditorView) {
    function onChange(e: React.ChangeEvent<HTMLInputElement>) {
      toggleBoolean(view, view.posAtDOM(e.target));
    }

    return <Checkbox checked={ props } onChange={ onChange }/>;
  }
}


function checkboxes(view: EditorView) {
  let widgets: Range<Decoration>[] = [];

  for (let { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: (type, from, to) => {
        const value = view.state.doc.sliceString(from, to);
        if (value === "[ ]" || value === "[x]") {
          let isTrue = value === "[ ]";

          let decorator = Decoration.replace({
            widget: new CheckboxWidget(isTrue)
          });
          widgets.push(decorator.range(from, to));
        }
      }
    });
  }

  return Decoration.set(widgets);
}


const checkboxPlugin = ViewPlugin.fromClass(class {
  decorations: DecorationSet;


  constructor(view: EditorView) {
    this.decorations = checkboxes(view);
  }


  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged)
      this.decorations = checkboxes(update.view);
  }
}, {
  decorations: v => v.decorations
});


function toggleBoolean(view: EditorView, pos: number) {
  console.log("toggleBoolean", pos);

  let before = view.state.doc.sliceString(Math.max(0, pos - 5), pos);
  let change;
  if (before == "[ ]")
    change = { from: pos - 3, to: pos, insert: "[x]" };
  else if (before == "[x]")
    change = { from: pos - 3, to: pos, insert: "[ ]" };
  else
    return false;
  view.dispatch({ changes: change });
  return true;
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
      checkboxPlugin,
    ]
  });
}
