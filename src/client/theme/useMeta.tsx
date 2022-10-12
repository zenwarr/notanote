import { useEffect } from "react";


export function useMeta(name: string, value: string | undefined) {
  useEffect(() => {
    const nodes = document.head.querySelectorAll(`meta[name=${ name }]`);
    nodes.forEach(node => node.remove());

    if (value != null) {
      const node = document.createElement("meta");
      node.setAttribute("name", name);
      node.setAttribute("content", value);
      document.head.appendChild(node);
    }
  }, [ name, value ]);
}
