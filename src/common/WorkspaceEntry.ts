export interface WorkspaceEntry {
  id: string;
  name: string;
  children?: WorkspaceEntry[];
  type: "file" | "dir";
}

export interface EntryInfo {
  content: string;
}

export interface CreateEntryReply {
  path: string;
  entries: WorkspaceEntry[];
}
