export type FileSettings = BlockSettings & {
  tabWidth?: number;
  lang?: string;
  blocks?: { [name: string]: BlockSettings };
  drawWhitespace?: boolean;
  editor?: {
    name: string;
    [name: string]: unknown;
  },
  remoteFonts?: string[];
}


export interface BlockSettings {
  fontFamily?: string;
  fontSize?: number | string;
  fontWeight?: string;

  lineHeight?: number;
  paragraphSpacing?: number;
  hyphens?: string;
  textIndent?: number;

  color?: string;
}
