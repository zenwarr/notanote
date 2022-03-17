// import { makeStyles } from "@mui/styles";
// import autocomplete, { ActionKind, FromTo } from "prosemirror-autocomplete";
// import * as ReactDOM from "react-dom";
// import cn from "classnames";
// import { EditorView } from "prosemirror-view";
// import { schema } from "prosemirror-markdown";
// import "./ProseCompletion.css";
//
//
// interface ProseCompletionOption {
//   title: string;
//   nodeType: string;
//   nodeAttrs?: { [key: string]: any };
// }
//
//
// interface ProseCompletionProps {
//   options: ProseCompletionOption[];
//   selectedIndex: number | undefined;
//   positionReference: Element | null;
//   open: boolean;
//   view: EditorView | undefined;
//   range: FromTo | undefined;
//   onSelect: (option: ProseCompletionOption) => void;
// }
//
//
// function ProseCompletion(props: ProseCompletionProps) {
//   const classes = useStyles();
//
//   if (!props.open) {
//     return null;
//   }
//
//   function onKeyDown(e: React.KeyboardEvent) {
//     if (e.key === "Enter" && props.selectedIndex != null) {
//       e.preventDefault();
//       e.stopPropagation();
//       props.onSelect(props.options[props.selectedIndex]);
//     }
//   }
//
//   return <div className={ classes.root }>
//     {
//       props.options.map((option, index) => <div key={ option.title }
//                                                 onClick={ () => props.onSelect(option) }
//                                                 onKeyDown={ onKeyDown }
//                                                 className={ cn(classes.option, { [classes.selected]: index === props.selectedIndex }) }>
//         { option.title }
//       </div>)
//     }
//   </div>;
// }
//
//
// const useStyles = makeStyles(theme => ({
//   root: {
//     border: "1px solid gray",
//     background: "black",
//     userSelect: "none"
//   },
//   option: {
//     display: "block",
//     padding: 5
//   },
//   selected: {
//     background: "gray"
//   }
// }));
//
//
// const ALL_OPTIONS: ProseCompletionOption[] = [
//   { title: "Header 1", nodeType: "heading", nodeAttrs: { level: 1 } },
//   { title: "Header 2", nodeType: "heading", nodeAttrs: { level: 2 } },
//   { title: "Header 3", nodeType: "heading", nodeAttrs: { level: 3 } },
//   { title: "Header 4", nodeType: "heading", nodeAttrs: { level: 4 } },
//   { title: "List", nodeType: "list" },
//   { title: "Quote", nodeType: "quote" },
//   { title: "Divider", nodeType: "horizontal_rule" }
// ];
//
//
// export function getCompletionPlugin() {
//   const state: ProseCompletionProps = {
//     open: false,
//     options: ALL_OPTIONS,
//     positionReference: null,
//     selectedIndex: undefined,
//     onSelect: applyOption,
//     view: undefined,
//     range: undefined
//   };
//
//   function applyOption(option: ProseCompletionOption) {
//     if (!state.view || !state.range) {
//       return;
//     }
//
//     apply(option, state.view, state.range);
//   }
//
//   function update(reposition: boolean = false) {
//     let container: HTMLElement | null = document.getElementById("prose-editor-autocomplete-popup");
//     if (!container) {
//       container = document.createElement("div");
//       container.style.position = "absolute";
//       container.id = "prose-editor-autocomplete-popup";
//       document.body.appendChild(container);
//     }
//
//     if (reposition && state.positionReference) {
//       const rect = state.positionReference.getBoundingClientRect();
//       container.style.top = `${ rect.top + rect.height }px`;
//       container.style.left = `${ rect.left }px`;
//     }
//
//     container.style.display = state.open ? "block" : "none";
//
//     ReactDOM.render(<ProseCompletion { ...state } />, container);
//   }
//
//   function incSelectionIndex(delta: number) {
//     let newIndex = state.selectedIndex != null ? state.selectedIndex + delta : 0;
//     if (newIndex < 0) {
//       newIndex = state.options.length - 1;
//     } else if (newIndex >= state.options.length) {
//       newIndex = 0;
//     }
//
//     state.selectedIndex = newIndex;
//   }
//
//   function filter(filter: string | undefined) {
//     function matchesFilter(option: ProseCompletionOption | undefined) {
//       if (!option) {
//         return false;
//       }
//
//       if (!filter) {
//         return true;
//       }
//
//       return option.title.toLowerCase().includes(filter.toLowerCase());
//     }
//
//     let newSelectedIndex: number | undefined;
//     for (let q = state.selectedIndex || 0; q >= 0; --q) {
//       if (matchesFilter(state.options[q])) {
//         newSelectedIndex = q;
//         break;
//       }
//     }
//
//     state.options = state.options.filter(matchesFilter);
//     state.selectedIndex = newSelectedIndex || 0;
//   }
//
//   function apply(option: ProseCompletionOption, view: EditorView, range: FromTo) {
//     let tr = view.state.tr.replaceWith(
//         range.from,
//         range.to,
//         schema.node(option.nodeType, option.nodeAttrs || {})
//     );
//
//     view.dispatch(tr);
//     view.focus();
//   }
//
//   return autocomplete({
//     triggers: [
//       { name: "command", trigger: "/" }
//     ],
//     reducer: (action: any) => {
//       state.view = action.view;
//       state.range = action.range;
//       switch (action.kind) {
//         case ActionKind.open:
//           state.open = true;
//           state.positionReference = document.getElementsByClassName("autocomplete")[0];
//           state.options = ALL_OPTIONS;
//           update(true);
//           return true;
//
//         case ActionKind.down:
//           incSelectionIndex(1);
//           update();
//           return true;
//
//         case ActionKind.up:
//           incSelectionIndex(-1);
//           update();
//           return true;
//
//         case ActionKind.enter:
//           update();
//           const option = state.options[state.selectedIndex || -1];
//           if (option) {
//             apply(option, action.view, action.range);
//           }
//           return true;
//
//         case ActionKind.filter:
//           filter(action.filter || undefined);
//           update();
//           return true;
//
//         case ActionKind.close:
//           state.open = false;
//           update();
//           return true;
//
//         default:
//           return true;
//       }
//     }
//   });
// }
