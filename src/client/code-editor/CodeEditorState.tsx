import { EditorSelection, EditorState, Extension, StateCommand, Text } from "@codemirror/state";
import { history, historyKeymap } from "@codemirror/commands";
import { getIndentation, IndentContext, indentOnInput, indentString, syntaxTree } from "@codemirror/language";
import { defaultHighlightStyle, HighlightStyle, bracketMatching, syntaxHighlighting } from "@codemirror/language";
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import {
  drawSelection,
  EditorView, highlightActiveLine,
  highlightSpecialChars,
  KeyBinding,
  keymap,
  placeholder,
  scrollPastEnd,
  ViewPlugin,
  ViewUpdate
} from "@codemirror/view";
import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import { createHighlightStyle } from "./Highlight";
import { FileSettings } from "@common/Settings";
import { json } from "@codemirror/lang-json";
import { javascript } from "@codemirror/lang-javascript";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { CHECKBOX_RE} from "./ReactWidget";
import { NodeProp } from "@lezer/common";
import { languages } from "@codemirror/language-data";
import { format } from "date-fns";
import { Document, DocumentEditorStateAdapter } from "../document/Document";
import { StoragePath } from "@storage/StoragePath";


function getEditorPluginForFile(entryPath: StoragePath) {
  const name = entryPath.basename;
  if (name.endsWith(".json")) {
    return json();
  } else if (name.endsWith(".js")) {
    return javascript({ jsx: false, typescript: false });
  } else if (name.endsWith(".jsx")) {
    return javascript({ jsx: true, typescript: false });
  } else if (name.endsWith(".ts")) {
    return javascript({ jsx: false, typescript: true });
  } else if (name.endsWith(".tsx")) {
    return javascript({ jsx: true, typescript: true });
  } else {
    return markdown({
      base: markdownLanguage,
      codeLanguages: languages
    });
  }
}


function getPluginsFromSettings(entryPath: StoragePath, settings: FileSettings): Extension[] {
  const r: Extension[] = [];

  if (settings.drawWhitespace) {
    r.push(highlightSpecialChars({
      specialChars: /[ ]/gi,
      render: code => {
        const el = document.createElement("span");
        el.textContent = "·";
        el.className = "cm-whitespace";
        return el;
      }
    }));
  }

  // if (entryPath.basename.endsWith(".md")) {
  //   r.push(checkboxPlugin);
  // }

  return r;
}


export interface CreateEditorStateOptions {
  onUpdate: (upd: ViewUpdate) => void;
}


function getStoredSelectionForFile(entryPath: StoragePath, fileContent: string): EditorSelection | undefined {
  const stored = localStorage.getItem("stored-selection-" + entryPath.normalized);
  if (!stored) {
    return undefined;
  }

  try {
    const range = JSON.parse(stored);
    if (typeof range.anchor === "number" && range.anchor < fileContent.length) {
      return range;
    } else {
      return undefined;
    }
  } catch (err) {
    return undefined;
  }
}


function storeSelectionForFile(entryPath: StoragePath, selection: EditorSelection) {
  localStorage.setItem("stored-selection-" + entryPath.normalized, JSON.stringify({
    anchor: selection.ranges[0]?.anchor,
    head: selection.ranges[0]?.head
  }));
}


export function createEditorState(content: string, entryPath: StoragePath, settings: FileSettings, options: CreateEditorStateOptions) {
  return EditorState.create({
    doc: content,
    selection: getStoredSelectionForFile(entryPath, content) || { anchor: 0 },
    extensions: [
      history(),
      drawSelection(),
      EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      bracketMatching(),
      closeBrackets(),
      autocompletion(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      syntaxHighlighting(HighlightStyle.define(createHighlightStyle(settings))),
      highlightSelectionMatches(),
      placeholder("< your note here >"),
      EditorView.lineWrapping,
      // gutter.lineNumbers(),
      // gutter.highlightActiveLineGutter(),
      keymap.of([
        ...customKeymap,
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...completionKeymap,
        indentWithTab
      ]),
      highlightActiveLine(),
      getEditorPluginForFile(entryPath),
      ViewPlugin.fromClass(class {
        update(upd: ViewUpdate) {
          storeSelectionForFile(entryPath, upd.state.selection);
          options.onUpdate(upd);
        }
      }),
      EditorState.tabSize.of(settings.tabWidth ?? 2),
      scrollPastEnd(),
      ...getPluginsFromSettings(entryPath, settings),
      EditorView.contentAttributes.of({ spellcheck: "true" }),
      autocompletion({
        activateOnTyping: true,
        override: [
          ctx => {
            const match = ctx.matchBefore(/\/[a-z]*/i);
            if (!match) {
              return null;
            }

            return {
              from: match.from,
              to: match.to,
              options: [
                {
                  label: "/check",
                  apply: "[ ] "
                },
                {
                  label: "/header1",
                  apply: "# "
                },
                {
                  label: "/header2",
                  apply: "## "
                },
                {
                  label: "/header3",
                  apply: "### "
                },
                {
                  label: "/header4",
                  apply: "#### "
                },
                {
                  label: "/date",
                  apply: (view, completion, from, to) => {
                    view.dispatch({ changes: { from, to, insert: getCurrentDate() } });
                  }
                }
              ]
            };
          }
        ]
      })
    ]
  });
}


function getCurrentDate(): string {
  return format(new Date(), "dd.LL.yyyy");
}


function isBetweenBrackets(state: EditorState, pos: number): { from: number, to: number } | null {
  if (/\(\)|\[\]|\{\}/.test(state.sliceDoc(pos - 1, pos + 1))) return { from: pos, to: pos };
  let context = syntaxTree(state).resolveInner(pos);
  let before = context.childBefore(pos), after = context.childAfter(pos), closedBy;
  if (before && after && before.to <= pos && after.from >= pos &&
      (closedBy = before.type.prop(NodeProp.closedBy)) && closedBy.indexOf(after.name) > -1 &&
      state.doc.lineAt(before.to).from == state.doc.lineAt(after.from).from)
    return { from: before.to, to: after.from };
  return null;
}


const newlineEditorCommand: StateCommand = ctx => {
  const { state } = ctx;

  if (state.readOnly) {
    return false;
  }

  let changes = state.changeByRange(range => {
    let { from, to } = range,
        line = state.doc.lineAt(from);

    let explode = from == to && isBetweenBrackets(state, from);

    let cx = new IndentContext(state, { simulateBreak: from, simulateDoubleBreak: !!explode });
    let indent = getIndentation(cx, from);

    const curLineText = state.doc.lineAt(from).text;
    if (indent == null) {
      indent = /^\s*/.exec(curLineText)![0].length;
    }

    while (to < line.to && /\s/.test(line.text[to - line.from])) {
      to++;
    }

    if (explode) {
      ({ from, to } = explode);
    } else if (from > line.from && from < line.from + 100 && !/\S/.test(line.text.slice(0, from))) {
      from = line.from;
    }

    const isCheckboxLine = curLineText.slice(indent, indent + 3).match(CHECKBOX_RE) != null;
    let insert = [ "", indentString(state, indent) + (isCheckboxLine ? "[ ] " : "") ];

    if (explode) {
      insert.push(indentString(state, cx.lineIndent(line.from, -1)));
    }

    return {
      changes: { from, to, insert: Text.of(insert) },
      range: EditorSelection.cursor(from + 1 + insert[1].length)
    };
  });

  ctx.dispatch(state.update(changes, { scrollIntoView: true, userEvent: "input" }));
  return true;
};


const customKeymap: KeyBinding[] = [
  { key: "Enter", run: newlineEditorCommand }
];


export class CodeEditorStateAdapter implements DocumentEditorStateAdapter {
  constructor(doc: Document, initialContent: Buffer) {
    this.doc = doc;
    const self = this;
    this.state = createEditorState(initialContent.toString(), doc.entry.path, doc.settings, {
      onUpdate: upd => {
        self.state = upd.state;
        if (upd.docChanged) {
          self.doc.onChanges();
        }
      }
    });
  }


  serializeContent() {
    return this.state.doc.toString();
  }


  state: EditorState;
  private readonly doc: Document;
}
