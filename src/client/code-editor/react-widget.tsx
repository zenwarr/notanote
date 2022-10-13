import { Decoration, DecorationSet, EditorView, MatchDecorator, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view";
import * as ReactDOM from "react-dom";
import { ReactElement } from "react";


abstract class ReactWidget<StateType> extends WidgetType {
  constructor(state: StateType) {
    super();
    this.state = state;
  }


  readonly state: StateType;


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
  render(isChecked: boolean, view: EditorView) {
    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      this.toggleBoolean(view, view.posAtDOM(e.target));
    };

    return <input type={ "checkbox" } checked={ isChecked } onChange={ onChange } style={ { verticalAlign: "middle" } }/>;
  }


  toggleBoolean(view: EditorView, pos: number) {
    const start = pos - 3;
    const end = pos;

    let checkText = view.state.doc.sliceString(start, end);

    let change;
    if (checkText == "[ ]") {
      change = { from: start, to: end, insert: "[x]" };
    } else if (checkText === "[x]") {
      change = { from: start, to: end, insert: "[ ]" };
    } else {
      return false;
    }

    view.dispatch({ changes: change });
    return true;
  }
}


export const CHECKBOX_RE = /\[[ x]]/g;


export const checkboxPlugin = ViewPlugin.fromClass(class {
  decorations: DecorationSet;
  matcher: MatchDecorator;


  constructor(view: EditorView) {
    this.matcher = new MatchDecorator({
      regexp: CHECKBOX_RE,
      decoration: match => Decoration.replace({
        widget: new CheckboxWidget(match[0] === "[x]"),
        inclusive: true
      })
    });

    this.decorations = this.matcher.createDeco(view);
  }


  /**
   * Notifies plugin of an updated that happened in the view.
   * Called before updated DOM is applied.
   * Should update internal state of the plugin.
   * @param update
   */
  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = this.matcher.updateDeco(update, this.decorations);
    }
  }
}, {
  /**
   * This function gets called with plugin value and returns decoration set.
   * In this case, plugin value is instance of class we give as a first argument.
   */
  decorations: v => v.decorations,

  /**
   * In this case, we report to editor that ranges covering checkboxes should be treated as atomic values.
   * It means cursor should never be placed inside them.
   */
  // provide: PluginField.atomicRanges.from(v => v.decorations)
});
