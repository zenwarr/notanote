import { StoragePath } from "@storage/storage-path";
import { useCallback, useMemo, useState } from "react";


function getParents(p: StoragePath) {
  const result: string[] = [];

  do {
    result.push(p.normalized);
    p = p.parentDir;
  } while (!p.isEqual(StoragePath.root));

  return result;
}


export function useExpandedPaths(selected: StoragePath | undefined) {
  const [ expanded, setExpanded ] = useState<string[]>(selected ? [ ...getParents(selected) ] : []);

  return {
    expanded,
    onToggle: (path: StoragePath) => {
      const isAlreadyExpanded = expanded.includes(path.normalized);
      if (isAlreadyExpanded) {
        // collapse this item and all its children
        setExpanded(expanded.filter(x => !new StoragePath(x).inside(path, true)));
      } else {
        const parents = getParents(path);
        setExpanded([ ...new Set([ ...expanded, ...parents ]) ]);
      }
    }
  };
}
