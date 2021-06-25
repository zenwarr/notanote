import ky from "ky";
import { CreateEntryReply, EntryInfo, WorkspaceEntry } from "../../common/WorkspaceEntry";


export class WorkspaceBackend {
  async loadTree(wsId: string) {
    return ky(`/api/workspaces/${wsId}/tree`).json<WorkspaceEntry[]>();
  }


  async createEntry(wsId: string, parent: string, name: string | undefined, type: "file" | "dir"): Promise<CreateEntryReply> {
    return ky.post(`/api/workspaces/${wsId}/files`, {
      json: {
        parent,
        name,
        type
      }
    }).json<CreateEntryReply>();
  }


  async getEntry(wsId: string, entryPath: string): Promise<EntryInfo> {
    return ky(`/api/workspaces/${wsId}/files/${ encodeURIComponent(entryPath) }`).json<EntryInfo>();
  }


  async saveEntry(wsId: string, entryPath: string, content: string): Promise<void> {
    await ky.put(`/api/workspaces/${wsId}/files/${ encodeURIComponent(entryPath) }`, {
      json: {
        content
      }
    }).json<EntryInfo>();
  }
}


const DEMO_WORKSPACE: WorkspaceEntry[] = [
  {
    type: "file",
    id: "file.md",
    name: "file.md file.md file.md file.md file.md file.md file.md vv"
  },
  {
    type: "dir",
    id: "dir",
    name: "dir",
    children: [
      {
        type: "file",
        id: "dir/nested.md",
        name: "nested.md"
      }
    ]
  }
];


export class TestWorkspaceBackend implements WorkspaceBackend {
  async loadTree(wsId: string): Promise<WorkspaceEntry[]> {
    return DEMO_WORKSPACE;
  }


  async createEntry(wsId: string, parent: string, name: string | undefined, type: "file" | "dir"): Promise<CreateEntryReply> {
    console.log("create entry:", parent, name, type);
    return {
      path: "/new-file.md",
      entries: [ ...DEMO_WORKSPACE ]
    };
  }


  async getEntry(wsId: string, entryPath: string): Promise<EntryInfo> {
    if (entryPath === "file.md" || entryPath === "dir/nested.md") {
      return {
        content: "File content\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n1\n2\n"
      };
    } else {
      throw new Error("Entry not found");
    }
  }


  async saveEntry(wsId: string, entryPath: string, content: string): Promise<void> {
    console.log("save entry", entryPath, content);
  }
}
