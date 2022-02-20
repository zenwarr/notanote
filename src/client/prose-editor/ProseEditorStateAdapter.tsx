import { Document, DocumentEditorStateAdapter } from "../Document";
import { EditorState, Transaction } from "prosemirror-state";
import { schema, defaultMarkdownParser, defaultMarkdownSerializer } from "prosemirror-markdown";
import { StoragePath } from "../../common/storage/StoragePath";
import { FileSettings } from "../../common/Settings";
import { baseKeymap } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { parseMarkdown } from "./MarkdownParser";


export class ProseEditorStateAdapter implements DocumentEditorStateAdapter {
  constructor(doc: Document) {
    this.doc = doc;
    this.state = createEditorState(doc.initialSerializedContent, doc.entryPath, doc.settings);
  }


  serializeContent() {
    return defaultMarkdownSerializer.serialize(this.state.doc);
  }


  applyTx(tx: Transaction) {
    const newState = this.state.apply(tx);
    this.state = newState;
    this.doc.onChanges();
    return newState;
  }


  state: EditorState;
  private readonly doc: Document;
}


function createEditorState(content: string, path: StoragePath, settings: FileSettings) {
  return EditorState.create({
    doc: parseMarkdown(content),
    schema: schema,
    plugins: [
      keymap(baseKeymap),
    ]
  });
}
