export interface WorkspaceEntry {
  id: string;
  name: string;
  children?: WorkspaceEntry[];
  type: "file" | "dir";
  createTs: number | undefined;
  updateTs: number | undefined;
}


export type FileSettings = BlockSettings & {
  tabWidth?: number;
  lang?: string;
  blocks?: { [name: string]: BlockSettings }
}


export interface BlockSettings {
  fontFamily?: string;
  fontSize?: number | string;
  fontWeight?: string;

  lineHeight?: number;
  paragraphSpacing?: number;
  hyphens?: string
  textIndent?: number;

  color?: string;
}


export interface EntryInfo {
  settings: FileSettings;
  content: string;
}


export interface CreateEntryReply {
  path: string;
  entries: WorkspaceEntry[];
}


export type EntryType = "dir" | "file";
