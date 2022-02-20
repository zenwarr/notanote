import { PaletteOption } from "./Palette";
import { RecentDocStorage } from "./RecentDocStorage";
import levenshtein from "js-levenshtein";
import { ClientWorkspace } from "./ClientWorkspace";
import { StorageEntryPointer } from "../common/storage/StorageLayer";


const COMPLETE_RESULT_COUNT = 10;


export function filePaletteCompleter(value: string): PaletteOption[] {
  if (!value) {
    const recentDocs = RecentDocStorage.instance.getRecentDocs();
    let recentEntries: (StorageEntryPointer | undefined)[] = [];
    ClientWorkspace.instance.walk(entry => {
      if (entry.type !== "file") {
        return false;
      }

      const recentIndex = recentDocs.indexOf(entry.path.normalized);
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

    return recentEntries.map(entry => {
      const path = entry!.path;
      return {
        value: path.normalized,
        content: path.basename,
        description: path.normalized
      };
    });
  }

  value = value.toLowerCase();

  const result: PaletteOption[] = [];
  const resultIds: string[] = [];
  ClientWorkspace.instance.walk(entry => {
    if (entry.type === "file" && entry.path.normalized.toLowerCase().includes(value)) {
      result.push({
        value: entry.path.normalized,
        content: entry.path.basename,
        description: entry.path.normalized
      });
      resultIds.push(entry.path.normalized);
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

  const allEntries: StorageEntryPointer[] = [];
  const distance = new Map<string, number>();
  ClientWorkspace.instance.walk(entry => {
    const entryPath = entry.path.normalized;
    if (entry.type === "file" && !exclude.includes(entryPath)) {
      allEntries.push(entry);
      distance.set(entryPath, levenshtein(value, entryPath.toLowerCase()));
    }

    return false;
  });

  allEntries.sort((a, b) => distance.get(a.path.normalized)! - distance.get(b.path.normalized)!);

  return allEntries.slice(0, count).map(entry => ({
    value: entry.path.normalized,
    content: entry.path.basename,
    description: entry.path.normalized
  }));
}
