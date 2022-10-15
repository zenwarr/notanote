import { syntaxTree } from "@codemirror/language";
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  WidgetType
} from "@codemirror/view";
import { Range } from "@codemirror/state";
import { getParentWithClass } from "./widget-utils";
import { openLink } from "workspace/routing";


export class LinkWidget extends WidgetType {
  constructor(url: string) {
    super();
    this.url = url;
  }


  private readonly url: string;


  toDOM(view: EditorView): HTMLElement {
    const link = document.createElement("a");
    link.href = this.url;
    link.target = "_blank";
    link.innerText = this.url;
    return link;
  }
}


function getLinkDecorations(view: EditorView) {
  const widgets: Range<Decoration>[] = [];

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: ({ type, from, to, node }) => {
        if (type.name !== "URL") {
          return;
        }

        const parent = node.parent;
        if (parent) {
          let url = view.state.sliceDoc(from, to);
          const dec = Decoration.mark({
            class: "cm-link",
            attributes: {
              "data-link": url,
              title: `Ctrl+Click to follow the link`
            }
            // widget: new LinkWidget(view.state.sliceDoc(from, to))
          }).range(parent.from, parent.to);
          widgets.push(dec);
        }
      }
    });
  }

  return Decoration.set(widgets, true);
}


const linkDecorations = ViewPlugin.fromClass(class {
  decorations: DecorationSet;


  constructor(view: EditorView) {
    this.decorations = getLinkDecorations(view);
    view.dom.addEventListener("click", (e) => {
      if (!e.target || !e.ctrlKey) {
        return;
      }

      const link = getParentWithClass(e.target as HTMLElement, "cm-link");
      if (!link) {
        return;
      }

      const linkTarget = link.getAttribute("data-link");
      if (!linkTarget) {
        return
      }

      openLink(linkTarget)
    });
  }


  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = getLinkDecorations(update.view);
    }
  }
}, {
  decorations: (v) => v.decorations
});


const linkTheme = EditorView.baseTheme({
  [".cm-link"]: {}
});


export const linkPlugin = [ linkDecorations, linkTheme ];
