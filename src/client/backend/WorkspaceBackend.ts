import ky from "ky";
import { CreateEntryReply, EntryInfo, WorkspaceEntry } from "../../common/WorkspaceEntry";
import { timeout } from "./timeout";
import { tags } from "@codemirror/highlight";


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


  async removeEntry(wsId: string, entryPath: string): Promise<WorkspaceEntry[]> {
    return ky.delete(`/api/workspaces/${ wsId }/files/${ entryPath }`).json<WorkspaceEntry[]>();
  }


  async initGithub(wsId: string, email: string, remote: string): Promise<void> {
    await ky.post(`/api/workspaces/${ wsId }/github/init`, {
      json: {
        email,
        remote
      }
    }).json();
  }


  async githubPush(wsId: string): Promise<void> {
    await ky.post(`/api/workspaces/${wsId}/github/push`).json();
  }
}


const DEMO_WORKSPACE: WorkspaceEntry[] = [
  {
    type: "dir",
    id: ".note",
    name: ".note",
    createTs: new Date().valueOf(),
    updateTs: new Date().valueOf(),
    children: [
      {
        type: "file",
        id: ".note/settings.json",
        name: "settings.json",
        createTs: new Date().valueOf(),
        updateTs: new Date().valueOf(),
      }
    ]
  },
  {
    type: "file",
    id: "file.md",
    name: "file.md file.md file.md file.md file.md file.md file.md vv",
    createTs: new Date().valueOf(),
    updateTs: new Date().valueOf(),
  },
  {
    type: "dir",
    id: "another-dir",
    name: "another-dir",
    createTs: new Date().valueOf(),
    updateTs: new Date().valueOf(),
  },
  {
    type: "dir",
    id: "dir",
    name: "dir",
    createTs: new Date().valueOf(),
    updateTs: new Date().valueOf(),
    children: [
      {
        type: "file",
        id: "dir/nested.md",
        name: "nested.md",
        createTs: new Date().valueOf(),
        updateTs: new Date().valueOf(),
      }
    ]
  },
  {
    type: "dir",
    id: "second-dir",
    name: "second-dir",
    createTs: new Date().valueOf(),
    updateTs: new Date().valueOf(),
    children: [
      {
        type: "file",
        id: "second-dir/nested.md",
        name: "nested.md",
        createTs: new Date().valueOf(),
        updateTs: new Date().valueOf(),
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
      const r: any = {};
      for (const key of Object.keys(tags)) {
        r[key] = { color: "blue" + key };
      }

      return {
        settings: {
          fontSize: 16,
          fontFamily: "Cascadia Code",
          lang: "ru",
          hyphens: "auto",
          paragraphSpacing: 10,
          lineHeight: 1.4,
          textIndent: 30,
          tabWidth: 4,
          blocks: {
            ...r,
            processingInstruction: { color: "lightgray" }
          },
          drawWhitespace: true,
          editor: {
            name: "pluginConfig",
            columns: [
              { type: "text", label: "First" },
              { type: "text", label: "Second" }
            ]
          }
        },
        content: JSON.stringify({
          plugins: [
            {
              name: "default",
              gitCloneUrl: "clone url"
            }
          ]
        })
      };
    } else if (entryPath === ".note/settings.json") {
      return {
        settings: {},
        content: "{}"
      };
    } else {
      throw new Error("Entry not found");
    }
  }


  async saveEntry(wsId: string, entryPath: string, content: string): Promise<void> {
    console.log("save entry", entryPath, content);
    await timeout(1000);
  }


  async removeEntry(wsId: string, entryPath: string): Promise<WorkspaceEntry[]> {
    console.log("delete entry", entryPath);
    await timeout(1000);
    return DEMO_WORKSPACE;
  }


  async initGithub(wsId: string, email: string, remote: string): Promise<void> {
    console.log("init github", email, remote);
  }


  async githubPush(wsId: string): Promise<void> {
    await timeout(3000);
    console.log("github push");
  }
}
