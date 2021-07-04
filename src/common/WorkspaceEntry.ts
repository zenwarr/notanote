export interface WorkspaceEntry {
  id: string;
  name: string;
  children?: WorkspaceEntry[];
  type: "file" | "dir";
}

export interface FileSettings {
  tabWidth?: number;
  textIndent?: number;
  lineHeight?: number;
  paragraphSpacing?: number;
  hyphens?: string;
  fontSize?: number;
  fontFamily?: string;
  lang?: string;
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
