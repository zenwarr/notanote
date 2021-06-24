import ky from "ky";
import { WorkspaceEntry } from "../../common/WorkspaceEntry";


export class WorkspaceBackend {
  async loadTree() {
    return ky("/api/workspaces/default/tree").json<WorkspaceEntry[]>();
  }


  async createEntry(path: string, type: "file" | "dir"): Promise<WorkspaceEntry[]> {
    return ky.post("/api/workspaces/default/files", {
      json: {
        path,
        type
      }
    }).json<WorkspaceEntry[]>();
  }
}


const DEMO_WORKSPACE: WorkspaceEntry[] = [
  {
    type: "file",
    id: "file.md",
    name: "file.md"
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
  async loadTree(): Promise<WorkspaceEntry[]> {
    return DEMO_WORKSPACE;
  }


  async createEntry(path: string, type: "file" | "dir"): Promise<WorkspaceEntry[]> {
    console.log("create entry:", path, type);
    return DEMO_WORKSPACE;
  }
}
