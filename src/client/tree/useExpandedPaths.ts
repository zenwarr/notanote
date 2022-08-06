import { useState } from "react";


function getParents(p: string) {
  const parts = p.split("/").filter(x => !!x);
  const result: string[] = [];
  for (let q = 0; q < parts.length; ++q) {
    result.push("/" + parts.slice(0, q + 1).join("/"));
  }
  return result;
}


export function useExpandedPaths(selected: string | undefined) {
  const [ expanded, setExpanded ] = useState<string[]>(selected ? [ ...getParents(selected) ] : []);

  return {
    expanded,
    onToggle: (node: string) => {
      const isAlreadyExpanded = expanded.includes(node);
      if (isAlreadyExpanded) {
        // collapse this item and all its children
        setExpanded(expanded.filter(x => x !== node && !x.startsWith(node + "/")));
      } else {
        const parents = getParents(node);
        setExpanded([ ...new Set([ ...expanded, ...parents ]) ]);
      }
    }
  };
}
