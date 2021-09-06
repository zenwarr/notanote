import { Decoration, DecorationSet, EditorView, Range, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view";
import * as ReactDOM from "react-dom";
import { ReactElement } from "react";
import { Checkbox } from "@material-ui/core";
import { syntaxTree } from "@codemirror/language";


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

export const checkboxPlugin = ViewPlugin.fromClass(class {
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
