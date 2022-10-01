import { StoragePath } from "@storage/StoragePath";


export function singlePatternMatches(sp: StoragePath, pattern: string): boolean {
  if (!pattern.startsWith("/")) {
    pattern = "/" + pattern;
  }

  const re = new RegExp(pattern);
  return sp.normalized.match(re) != null;
}


export function patternMatches(sp: StoragePath, patterns: string | string[]): boolean {
  if (typeof patterns === "string") {
    return singlePatternMatches(sp, patterns);
  } else {
    return patterns.some(p => singlePatternMatches(sp, p));
  }
}
