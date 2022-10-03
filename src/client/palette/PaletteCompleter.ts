import levenshtein from "js-levenshtein";
import { StorageEntryData } from "@storage/storage-entry-data";
import { Workspace } from "../workspace/Workspace";
import { PaletteOption } from "./Palette";
import { RecentDocStorage } from "../RecentDocStorage";


const COMPLETE_RESULT_COUNT = 10;


export function filePaletteCompleter(value: string): PaletteOption[] {
  if (!value) {
    const recentDocs = RecentDocStorage.instance.getRecentDocs();
    let recentEntries: (StorageEntryData | undefined)[] = [];
    Workspace.instance.walk(entry => {
      if (entry.stats.isDirectory) {
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
      const path = entry!.path; // because we filter the list above
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
  Workspace.instance.walk(entry => {
    const entryPath = entry.path;
    if (!entry.stats.isDirectory && entryPath.normalized.toLowerCase().includes(value)) {
      result.push({
        value: entryPath.normalized,
        content: entryPath.basename,
        description: entryPath.normalized
      });
      resultIds.push(entryPath.normalized);
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

  const allEntries: StorageEntryData[] = [];
  const distance = new Map<string, number>();
  Workspace.instance.walk(entry => {
    let normalizedPath = entry.path.normalized;
    if (!entry.stats.isDirectory && !exclude.includes(normalizedPath)) {
      allEntries.push(entry);
      distance.set(normalizedPath, levenshtein(value, normalizedPath.toLowerCase()));
    }

    return false;
  });

  allEntries.sort((a, b) => distance.get(a.path.normalized)! - distance.get(b.path.normalized)!);

  return allEntries.slice(0, count).map(entry => {
    let entryPath = entry.path;
    return {
      value: entryPath.normalized,
      content: entryPath.basename,
      description: entryPath.normalized
    }
  });
}
