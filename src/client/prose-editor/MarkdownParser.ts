import remarkParse from "remark-parse";
import { unified } from "unified";
import { Node } from "unist";
import { Fragment, Schema, Node as ProseNode } from "prosemirror-model";


const schema = new Schema({
  nodes: {
    doc: {
      content: "block+"
    },

    paragraph: {
      content: "inline*",
      group: "block",
      parseDOM: [ { tag: "p" } ],
      toDOM() {
        return [ "p", 0 ];
      }
    },

    blockquote: {
      content: "block+",
      group: "block",
      parseDOM: [ { tag: "blockquote" } ],
      toDOM() {
        return [ "blockquote", 0 ];
      }
    },

    horizontal_rule: {
      group: "block",
      parseDOM: [ { tag: "hr" } ],
      toDOM() {
        return [ "div", [ "hr" ] ];
      }
    },

    heading: {
      attrs: { level: { default: 1 } },
      content: "(text | image)*",
      group: "block",
      defining: true,
      parseDOM: [ { tag: "h1", attrs: { level: 1 } },
        { tag: "h2", attrs: { level: 2 } },
        { tag: "h3", attrs: { level: 3 } },
        { tag: "h4", attrs: { level: 4 } },
        { tag: "h5", attrs: { level: 5 } },
        { tag: "h6", attrs: { level: 6 } } ],
      toDOM(node) {
        return [ "h" + node.attrs.level, 0 ];
      }
    },

    code_block: {
      content: "text*",
      group: "block",
      code: true,
      defining: true,
      marks: "",
      attrs: { params: { default: "" } },
      parseDOM: [ {
        tag: "pre", preserveWhitespace: "full", getAttrs: node => (
            { params: (node as any).getAttribute("data-params") || "" }
        )
      } ],
      toDOM(node) {
        return [ "pre", node.attrs.params ? { "data-params": node.attrs.params } : {}, [ "code", 0 ] ];
      }
    },

    ordered_list: {
      content: "list_item+",
      group: "block",
      attrs: { order: { default: 1 }, tight: { default: false } },
      parseDOM: [ {
        tag: "ol", getAttrs(dom) {
          return {
            order: (dom as any).hasAttribute("start") ? +(dom as any).getAttribute("start") : 1,
            tight: (dom as any).hasAttribute("data-tight")
          };
        }
      } ],
      toDOM(node) {
        return [ "ol", {
          start: node.attrs.order == 1 ? null : node.attrs.order,
          "data-tight": node.attrs.tight ? "true" : null
        }, 0 ];
      }
    },

    bullet_list: {
      content: "list_item+",
      group: "block",
      attrs: { tight: { default: false } },
      parseDOM: [ { tag: "ul", getAttrs: dom => ({ tight: (dom as any).hasAttribute("data-tight") }) } ],
      toDOM(node) {
        return [ "ul", { "data-tight": node.attrs.tight ? "true" : null }, 0 ];
      }
    },

    list_item: {
      content: "paragraph block*",
      defining: true,
      parseDOM: [ { tag: "li" } ],
      toDOM() {
        return [ "li", 0 ];
      }
    },

    text: {
      group: "inline"
    },

    image: {
      inline: true,
      attrs: {
        src: {},
        alt: { default: null },
        title: { default: null }
      },
      group: "inline",
      draggable: true,
      parseDOM: [ {
        tag: "img[src]", getAttrs(dom) {
          return {
            src: (dom as any).getAttribute("src"),
            title: (dom as any).getAttribute("title"),
            alt: (dom as any).getAttribute("alt")
          };
        }
      } ],
      toDOM(node) {
        return [ "img", node.attrs ];
      }
    },

    hard_break: {
      inline: true,
      group: "inline",
      selectable: false,
      parseDOM: [ { tag: "br" } ],
      toDOM() {
        return [ "br" ];
      }
    }
  },

  marks: {
    em: {
      parseDOM: [ { tag: "i" }, { tag: "em" },
        { style: "font-style", getAttrs: value => value == "italic" && null } ],
      toDOM() {
        return [ "em" ];
      }
    },

    strong: {
      parseDOM: [ { tag: "b" }, { tag: "strong" },
        { style: "font-weight", getAttrs: value => /^(bold(er)?|[5-9]\d{2,})$/.test((value as string)) && null } ],
      toDOM() {
        return [ "strong" ];
      }
    },

    link: {
      attrs: {
        href: {},
        title: { default: null }
      },
      inclusive: false,
      parseDOM: [ {
        tag: "a[href]", getAttrs(dom) {
          return { href: (dom as any).getAttribute("href"), title: (dom as any).getAttribute("title") };
        }
      } ],
      toDOM(node) {
        return [ "a", node.attrs ];
      }
    },

    code: {
      parseDOM: [ { tag: "code" } ],
      toDOM() {
        return [ "code" ];
      }
    }
  }
});


export function parseMarkdown(text: string) {
  const processor = unified()
  .use(remarkParse);
  const root = processor.parse(text);
  return toRootNode(text, root);
}


function toRootNode(doc: string, root: Node): ProseNode {
  const rootProse = schema.topNodeType.create();
  rootProse.content = Fragment.from((root.children as any[]).map(child => toNode(doc, child)));
  return rootProse;
}


function toNode(doc: string, node: Node): ProseNode {
  switch (node.type) {
    case "text":
      return schema.text(node.value as string);
    case "paragraph":
      return schema.node("paragraph");
    case "heading":
      return schema.node("heading", { level: node.depth }, schema.text(getNodeText(doc, node)));
    case "list":
      return schema.node("bullet_list", { tight: node.ordered });
    case "listItem":
      return schema.node("list_item");
    case "image":
      return schema.node("image", { src: node.url, alt: node.alt, title: node.title });
    case "code":
      return schema.node("code_block", { params: node.lang });
    case "strong":
      return schema.node("strong");
    case "em":
      return schema.node("em");
    case "link":
      return schema.node("link", { href: node.url, title: node.title });
    case "hardBreak":
      return schema.node("hard_break");
    default:
      throw new Error("Method not implemented"); // todo
  }
}

function getNodeText(doc: string, node: Node) {
  const pos = node.position;
  if (!pos) {
    return "";
  }

  return doc.slice(pos.start.offset, pos.end.offset);
}
