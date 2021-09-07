import { PaletteOption } from "./Palette";
import { RecentDocStorage } from "./RecentDocStorage";
import { WorkspaceEntry } from "../common/WorkspaceEntry";
import levenshtein from "js-levenshtein";
import { WorkspaceManager } from "./WorkspaceManager";
import { COMMANDS } from "./Shortcuts";


const COMPLETE_RESULT_COUNT = 10;


export function filePaletteCompleter(value: string): PaletteOption[] {
  if (!value) {
    const recentDocs = RecentDocStorage.instance.getRecentDocs();
    let recentEntries: (WorkspaceEntry | undefined)[] = [];
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

    recentEntries = recentEntries.filter(x => x != null);
    if (recentEntries.length >= 2) {
      const swap = recentEntries[0];
      recentEntries[0] = recentEntries[1];
      recentEntries[1] = swap;
    }

    return recentEntries.map(entry => ({
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
  }));
}


export function commandPaletteCompleter(value: string): PaletteOption[] {
  return COMMANDS.filter(c => c.name.includes(value)).map(c => ({
    value: c.name,
    content: "/" + c.name,
    description: c.description
  }));
}
