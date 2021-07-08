import ky from "ky";
import { CreateEntryReply, EntryInfo, WorkspaceEntry } from "../../common/WorkspaceEntry";
import { timeout } from "./timeout";


export class WorkspaceBackend {
  async loadTree(wsId: string) {
    return ky(`/api/workspaces/${ wsId }/tree`).json<WorkspaceEntry[]>();
  }


  async createEntry(wsId: string, entryPath: string, type: "file" | "dir"): Promise<CreateEntryReply> {
    return ky.post(`/api/workspaces/${ wsId }/files`, {
      json: {
        entryPath,
        type
      }
    }).json<CreateEntryReply>();
  }


  async getEntry(wsId: string, entryPath: string): Promise<EntryInfo> {
    return ky(`/api/workspaces/${ wsId }/files/${ entryPath }`).json<EntryInfo>();
  }


  async saveEntry(wsId: string, entryPath: string, content: string): Promise<void> {
    await ky.put(`/api/workspaces/${ wsId }/files/${ entryPath }`, {
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
    id: "another-dir",
    name: "another-dir"
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


  async createEntry(wsId: string, entryPath: string, type: "file" | "dir"): Promise<CreateEntryReply> {
    console.log("create entry:", entryPath, type);
    return {
      path: "/new-file.md",
      entries: [ ...DEMO_WORKSPACE ]
    };
  }


  async getEntry(wsId: string, entryPath: string): Promise<EntryInfo> {
    if (entryPath === "file.md" || entryPath === "dir/nested.md") {
      return {
        settings: {
          fontSize: 16,
          fontFamily: "Cascadia Code",
          lang: "ru",
          hyphens: "auto",
          paragraphSpacing: 10,
          lineHeight: 1.4,
          textIndent: 30,
          tabWidth: 4
        },
        content: "File content\n1\n2"
      };
    } else {
      throw new Error("Entry not found");
    }
  }


  async saveEntry(wsId: string, entryPath: string, content: string): Promise<void> {
    console.log("save entry", entryPath, content);
    await timeout(1000);
  }
}
