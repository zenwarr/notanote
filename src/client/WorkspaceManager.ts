import { WorkspaceEntry } from "../common/WorkspaceEntry";
import { makeObservable, observable } from "mobx";
import { WorkspaceBackend } from "./backend/WorkspaceBackend";
import { Backend } from "./backend/Backend";


export class WorkspaceManager {
  constructor() {
    makeObservable(this, {
      entries: observable
    });
  }


  async load() {
    this.entries = await Backend.get(WorkspaceBackend).loadTree();
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


  async createEntry(id: string, type: "file" | "dir") {
    this.entries = await Backend.get(WorkspaceBackend).createEntry(id, type);
  }


  entries: WorkspaceEntry[] = [];
  static instance = new WorkspaceManager();
}
