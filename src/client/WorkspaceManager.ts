import { CreateEntryReply, WorkspaceEntry } from "../common/WorkspaceEntry";
import { makeObservable, observable } from "mobx";
import { WorkspaceBackend } from "./backend/WorkspaceBackend";
import { Backend } from "./backend/Backend";
import { RecentDocStorage } from "./RecentDocStorage";
import { PaletteOption } from "./Palette";
import levenshtein from "js-levenshtein";


export class WorkspaceManager {
  constructor() {
    makeObservable(this, {
      entries: observable,
      _selectedEntry: observable,
      _selectedFile: observable
    } as any);

    const lastOpenedDoc = RecentDocStorage.instance.getLastOpenedDoc();
    if (lastOpenedDoc) {
      this._selectedEntry = lastOpenedDoc;
      this._selectedFile = lastOpenedDoc;
    }
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
      this.selectedEntry = reply.path;
    }

    return reply;
  }


  async remove(entryPath: string) {
    this.selectedEntry = undefined;
    this.entries = await Backend.get(WorkspaceBackend).removeEntry(this.id, entryPath);
  }


  get selectedEntry() {
    return this._selectedEntry;
  }


  set selectedEntry(id: string | undefined) {
    if (id) {
      RecentDocStorage.instance.saveLastOpenedDoc(id);
    }
    this._selectedEntry = id;

    if (id == null) {
      this._selectedFile = undefined;
    } else {
      const entry = this.getEntryByPath(id);
      if (entry && entry.type === "file") {
        this._selectedFile = id;
      }
    }
  }


  get selectedFile() {
    return this._selectedFile;
  }


  entries: WorkspaceEntry[] = [];
  protected _selectedEntry: string | undefined = undefined;
  protected _selectedFile: string | undefined = undefined;
  id = "default";

  static instance = new WorkspaceManager();
}


const COMPLETE_RESULT_COUNT = 10;


export function workspaceFileCompleter(value: string): PaletteOption[] {
  if (!value) {
    const recentDocs = RecentDocStorage.instance.getRecentDocs();
    const recentEntries: (WorkspaceEntry | undefined)[] = [];
    WorkspaceManager.instance.walk(entry => {
      if (entry.type !== "file") {
        return false;
      }

      const recentIndex = recentDocs.indexOf(entry.id);
      if (recentIndex < 0) {
        return false;
      }

      recentEntries[recentIndex] = entry;
      return false;
    });

    return recentEntries.filter(x => x != null).map(entry => ({
      value: entry!.id,
      content: entry!.name,
      description: entry!.id
    }));
  }

  value = value.toLowerCase();

  const result: PaletteOption[] = [];
  const resultIds: string[] = [];
  WorkspaceManager.instance.walk(entry => {
    if (entry.type === "file" && entry.id.toLowerCase().includes(value)) {
      result.push({
        value: entry.id,
        content: entry.name,
        description: entry.id
      });
      resultIds.push(entry.id);
      if (result.length === COMPLETE_RESULT_COUNT) {
        return true;
      }
    }

    return false;
  });

  if (result.length < COMPLETE_RESULT_COUNT) {
    result.push(...getClosestEntries(value, COMPLETE_RESULT_COUNT - result.length, resultIds));
  }

  return result;
}


function getClosestEntries(value: string, count: number, exclude: string[]): PaletteOption[] {
  value = value.toLowerCase();

  const allEntries: WorkspaceEntry[] = [];
  const distance = new Map<string, number>();
  WorkspaceManager.instance.walk(entry => {
    if (entry.type === "file" && !exclude.includes(entry.id)) {
      allEntries.push(entry);
      distance.set(entry.id, levenshtein(value, entry.name.toLowerCase()));
    }

    return false;
  });

  allEntries.sort((a, b) => distance.get(a.id)! - distance.get(b.id)!);

  return allEntries.slice(0, count).map(entry => ({
    value: entry.id,
    content: entry.name,
    description: entry.id
  }))
}
