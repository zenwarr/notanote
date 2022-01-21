import { Tag, tags as t, TagStyle } from "@codemirror/highlight";
import { BlockSettings, FileSettings } from "../common/WorkspaceEntry";


const chalky = "#e5c07b",
    coral = "#e06c75",
    cyan = "#56b6c2",
    invalid = "#ffffff",
    ivory = "#abb2bf",
    stone = "#7d8799", // Brightened compared to original to increase contrast
    malibu = "#61afef",
    sage = "#98c379",
    whiskey = "#d19a66",
    violet = "#c678dd",
    darkBackground = "#21252b",
    highlightBackground = "#2c313a",
    background = "#282c34",
    tooltipBackground = "#353a42",
    selection = "#3E4451",
    cursor = "#528bff"


function createTagStyleFromBlockStyle(tag: Tag, style: BlockSettings): TagStyle {
  return {
    ...style,
    tag
  };
}


function getTagFromBlockName(block: string): Tag | undefined {
  return (t as any)[block];
}


function mergeStyle(a: TagStyle[], b: TagStyle[]): TagStyle[] {
  const result = a.map(style => ({ ...style }));

  for (const style of b) {
    const found = result.findIndex(r => r.tag === style.tag);
    if (found < 0) {
      result.push(style);
    } else {
      result[found] = {
        ...result[found],
        ...style
      };
    }
  }

  return result;
}


function createStylesFromBlocksSettings(settings: undefined | { [name: string]: BlockSettings }) {
  return Object.entries(settings ?? {}).map(([ key, value ]) => {
    const tag = getTagFromBlockName(key);
    if (tag) {
      return createTagStyleFromBlockStyle(tag, value);
    } else {
      return undefined;
    }
  }).filter(s => s != null) as TagStyle[]
}


const defaultHighlightStyles: TagStyle[] = [
  {tag: t.keyword, color: violet},
  {tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: coral},
  {tag: [t.function(t.variableName), t.labelName], color: malibu},
  {tag: [t.color, t.constant(t.name), t.standard(t.name)], color: whiskey},
  {tag: [t.definition(t.name), t.separator], color: ivory},
  {tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: chalky},
  {tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: cyan},
  {tag: [t.meta, t.comment], color: stone},
  {tag: t.strong, fontWeight: "bold"},
  {tag: t.emphasis, fontStyle: "italic"},
  {tag: t.strikethrough, textDecoration: "line-through"},
  {tag: t.link, color: stone, textDecoration: "underline"},
  {tag: t.heading, fontWeight: "bold"},
  {tag: [t.atom, t.bool, t.special(t.variableName)], color: whiskey },
  {tag: [t.processingInstruction, t.string, t.inserted], color: sage},
  {tag: t.invalid, color: invalid},
  {tag: t.heading1, fontWeight: "bold", fontSize: "1.7em"},
  {tag: t.heading2, fontWeight: "bold", fontSize: "1.6em"},
  {tag: t.heading3, fontWeight: "bold", fontSize: "1.4em"},
  {tag: t.monospace, fontFamily: "monospace"},
  {tag: t.processingInstruction, color: "gray"}
]


export function createHighlightStyle(settings: FileSettings): TagStyle[] {
  const userSpecified = createStylesFromBlocksSettings(settings.blocks);

  return mergeStyle(defaultHighlightStyles, userSpecified);
}
