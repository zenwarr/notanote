import { Tag, tags, TagStyle } from "@codemirror/highlight";
import { BlockSettings, FileSettings } from "../common/WorkspaceEntry";


const DEFAULT_BLOCK_SETTINGS: { [name: string]: BlockSettings } = {
  heading: {
    fontWeight: "bold"
  },
  heading1: {
    fontSize: "1.7em",
    fontWeight: "bold"
  },
  heading2: {
    fontSize: "1.6em",
    fontWeight: "bold"
  },
  heading3: {
    fontSize: "1.4em",
    fontWeight: "bold"
  },
  monospace: {
    fontFamily: "monospace"
  },
  processingInstruction: {
    color: "gray"
  },
  emphasis: {
    fontWeight: "bold"
  },
  strong: {
    fontWeight: "bold"
  }
};


function createTagStyleFromBlockStyle(tag: Tag, style: BlockSettings): TagStyle {
  return {
    ...style,
    tag
  };
}


function getTagFromBlockName(block: string): Tag | undefined {
  return (tags as any)[block];
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


export function createHighlightStyle(settings: FileSettings): TagStyle[] {
  const userSpecified = createStylesFromBlocksSettings(settings.blocks);
  const defaultStyles = createStylesFromBlocksSettings(DEFAULT_BLOCK_SETTINGS);

  return mergeStyle(defaultStyles, userSpecified);
}
