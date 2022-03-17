// import remarkParse from "remark-parse";
// import { unified } from "unified";
// import * as ast from "unist";
// import * as model from "prosemirror-model";
// import assert from "assert";
//
//
// export const schema = new model.Schema({
//   nodes: {
//     doc: {
//       content: "block+"
//     },
//
//     paragraph: {
//       content: "inline*",
//       group: "block",
//       parseDOM: [ { tag: "p" } ],
//       toDOM() {
//         return [ "p", 0 ];
//       }
//     },
//
//     blockquote: {
//       content: "block+",
//       group: "block",
//       parseDOM: [ { tag: "blockquote" } ],
//       toDOM() {
//         return [ "blockquote", 0 ];
//       }
//     },
//
//     horizontal_rule: {
//       group: "block",
//       parseDOM: [ { tag: "hr" } ],
//       toDOM() {
//         return [ "div", [ "hr" ] ];
//       }
//     },
//
//     heading: {
//       attrs: { level: { default: 1 } },
//       content: "(text | image)*",
//       group: "block",
//       defining: true,
//       parseDOM: [ { tag: "h1", attrs: { level: 1 } },
//         { tag: "h2", attrs: { level: 2 } },
//         { tag: "h3", attrs: { level: 3 } },
//         { tag: "h4", attrs: { level: 4 } },
//         { tag: "h5", attrs: { level: 5 } },
//         { tag: "h6", attrs: { level: 6 } } ],
//       toDOM(node) {
//         return [ "h" + node.attrs.level, 0 ];
//       }
//     },
//
//     code_block: {
//       content: "text*",
//       group: "block",
//       code: true,
//       defining: true,
//       marks: "",
//       attrs: { lang: { default: "" } },
//       parseDOM: [ {
//         tag: "pre", preserveWhitespace: "full", getAttrs: node => (
//             { params: (node as any).getAttribute("data-lang") || "" }
//         )
//       } ],
//       toDOM(node) {
//         return [ "pre", node.attrs.params ? { "data-lang": node.attrs.lang } : {}, [ "code", 0 ] ];
//       }
//     },
//
//     ordered_list: {
//       content: "list_item+",
//       group: "block",
//       attrs: { order: { default: 1 }, tight: { default: false } },
//       parseDOM: [ {
//         tag: "ol", getAttrs(dom) {
//           return {
//             order: (dom as any).hasAttribute("start") ? +(dom as any).getAttribute("start") : 1,
//             tight: (dom as any).hasAttribute("data-tight")
//           };
//         }
//       } ],
//       toDOM(node) {
//         return [ "ol", {
//           start: node.attrs.order == 1 ? null : node.attrs.order,
//           "data-tight": node.attrs.tight ? "true" : null
//         }, 0 ];
//       }
//     },
//
//     bullet_list: {
//       content: "list_item+",
//       group: "block",
//       attrs: { tight: { default: false } },
//       parseDOM: [ { tag: "ul", getAttrs: dom => ({ tight: (dom as any).hasAttribute("data-tight") }) } ],
//       toDOM(node) {
//         return [ "ul", { "data-tight": node.attrs.tight ? "true" : null }, 0 ];
//       }
//     },
//
//     list_item: {
//       content: "paragraph block*",
//       defining: true,
//       parseDOM: [ { tag: "li" } ],
//       toDOM() {
//         return [ "li", 0 ];
//       }
//     },
//
//     text: {
//       group: "inline"
//     },
//
//     image: {
//       inline: true,
//       attrs: {
//         src: {},
//         alt: { default: null },
//         title: { default: null }
//       },
//       group: "inline",
//       draggable: true,
//       parseDOM: [ {
//         tag: "img[src]", getAttrs(dom) {
//           return {
//             src: (dom as any).getAttribute("src"),
//             title: (dom as any).getAttribute("title"),
//             alt: (dom as any).getAttribute("alt")
//           };
//         }
//       } ],
//       toDOM(node) {
//         return [ "img", node.attrs ];
//       }
//     },
//
//     hard_break: {
//       inline: true,
//       group: "inline",
//       selectable: false,
//       parseDOM: [ { tag: "br" } ],
//       toDOM() {
//         return [ "br" ];
//       }
//     }
//   },
//
//   marks: {
//     em: {
//       parseDOM: [ { tag: "i" }, { tag: "em" },
//         { style: "font-style", getAttrs: value => value == "italic" && null } ],
//       toDOM() {
//         return [ "em" ];
//       }
//     },
//
//     strong: {
//       parseDOM: [ { tag: "b" }, { tag: "strong" },
//         { style: "font-weight", getAttrs: value => /^(bold(er)?|[5-9]\d{2,})$/.test((value as string)) && null } ],
//       toDOM() {
//         return [ "strong" ];
//       }
//     },
//
//     strike: {
//       parseDOM: [ { tag: "strike" }, { tag: "s" }, { tag: "del" } ],
//       toDOM() {
//         return [ "strike" ];
//       }
//     },
//
//     link: {
//       attrs: {
//         href: {},
//         title: { default: null }
//       },
//       inclusive: false,
//       parseDOM: [ {
//         tag: "a[href]", getAttrs(dom) {
//           return { href: (dom as any).getAttribute("href"), title: (dom as any).getAttribute("title") };
//         }
//       } ],
//       toDOM(node) {
//         return [ "a", node.attrs ];
//       }
//     },
//
//     code: {
//       parseDOM: [ { tag: "code" } ],
//       toDOM: () => [ "code" ]
//     }
//   }
// });
//
//
// export function parseMarkdown(text: string) {
//   const processor = unified().use(remarkParse);
//   const root = processor.parse(text);
//   return toRootNode(text, root as ast.Parent);
// }
//
//
// function toRootNode(doc: string, root: ast.Parent): model.Node {
//   return schema.node("doc", {}, root.children.map(child => toNode(doc, child)) || []);
// }
//
//
// function toNode(doc: string, node: ast.Node, marks: model.Mark[] = []): model.Node {
//   switch (node.type) {
//     case "text":
//       const text = getNodeText(doc, node, marks);
//       assert(text != null);
//       return text;
//     case "strong":
//       return getTextNodeWithMark(doc, node, marks, schema.mark("strong"));
//     case "emphasis":
//       return getTextNodeWithMark(doc, node, marks, schema.mark("em"));
//     case "inlineCode":
//       return getTextNodeWithMark(doc, node, marks, schema.mark("code"));
//     case "link":
//       return getTextNodeWithMark(doc, node, marks, schema.mark("link", {
//         href: node.url,
//         title: node.title
//       }));
//     case "delete":
//       return getTextNodeWithMark(doc, node, marks, schema.mark("strike"));
//     case "paragraph":
//       return schema.node("paragraph", {}, getChildren(doc, node));
//     case "heading":
//       return schema.node("heading", { level: node.depth }, getChildren(doc, node));
//     case "thematicBreak":
//       return schema.node("horizontal_rule");
//     case "code":
//       return schema.node("code_block", { lang: node.lang }, [ getNodeText(doc, node, [])! ]);
//     case "list":
//       return schema.node(node.ordered ? "ordered_list" : "bullet_list", {}, getChildren(doc, node));
//     case "listItem":
//       return schema.node("list_item", {}, getChildren(doc, node));
//     case "blockquote":
//       return schema.node("blockquote", {}, getChildren(doc, node));
//     case "image":
//       return schema.node("image", {
//         src: node.url,
//         title: node.title,
//         alt: node.alt
//       });
//     default:
//       return schema.node("paragraph", {}, getChildren(doc, node));
//   }
// }
//
// function getTextNodeWithMark(doc: string, node: ast.Node, marks: model.Mark[], mark: model.Mark) {
//   marks = [ ...marks, mark ]
//
//   const textNode = getNodeText(doc, node, marks);
//   if (textNode != null) {
//     return textNode.mark(marks);
//   }
//
//   const children = node.children as ast.Node[] | undefined;
//   assert(children != null && children.length > 0);
//   return toNode(doc, children[0], marks);
// }
//
// function getChildren(doc: string, node: ast.Node): model.Node[] {
//   const children = node.children as ast.Node[] | undefined;
//   if (!children) {
//     return []
//   }
//
//   return children.map(c => toNode(doc, c));
// }
//
// function getNodeText(doc: string, node: ast.Node, marks: model.Mark[]) {
//   if (node.value && typeof node.value === "string") {
//     return schema.text(node.value, marks);
//   } else {
//     return undefined;
//   }
// }
