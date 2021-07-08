import { CreateEntryReply, WorkspaceEntry } from "../common/WorkspaceEntry";
import { makeObservable, observable } from "mobx";
import { WorkspaceBackend } from "./backend/WorkspaceBackend";
import { Backend } from "./backend/Backend";


export class WorkspaceManager {
  constructor() {
    makeObservable(this, {
      entries: observable,
      selectedEntryPath: observable
    });
  }


  async load() {
    this.entries = await Backend.get(WorkspaceBackend).loadTree(this.id);
    return this.entries;
  }


  getEntryByPath(p: string): WorkspaceEntry | undefined {
    let found: WorkspaceEntry | undefined;

    this.walk(e => {
      if (e.id === p) {
        found = e;
        return true;
      } else {
        return false;
      }
    });

    return found;
  }


  walk(cb: (entry: WorkspaceEntry) => boolean) {
    function walkList(list: WorkspaceEntry[] | undefined): boolean {
      for (const e of list || []) {
        if (cb(e)) {
          return true;
        }

        if (walkList(e.children)) {
          return true;
        }
      }

      return false;
    }

    walkList(this.entries);
  }


  async createEntry(entryPath: string, type: "file" | "dir"): Promise<CreateEntryReply> {
    const reply = await Backend.get(WorkspaceBackend).createEntry(this.id, entryPath, type);
    this.entries = reply.entries;

    if (type === "file") {
      this.selectedEntryPath = reply.path;
    }

    return reply;
  }


  async remove(entryPath: string) {
    this.selectedEntryPath = undefined;
    this.entries = await Backend.get(WorkspaceBackend).removeEntry(this.id, entryPath);
  }


  entries: WorkspaceEntry[] = [];
  selectedEntryPath: string | undefined = undefined;
  id = "default";

  static instance = new WorkspaceManager();
}
