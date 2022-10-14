import { Decoration } from "@codemirror/view";


/**
 * Check if two ranges overlap
 * Based on the visual diagram on https://stackoverflow.com/a/25369187
 * @param range1 - Range 1
 * @param range2 - Range 2
 * @returns True if the ranges overlap
 */
export function checkRangeOverlap(range1: [ number, number ], range2: [ number, number ]) {
  return range1[0] <= range2[1] && range2[0] <= range1[1];
}


/**
 * Decoration to simply hide anything.
 */
export const invisibleDecoration = Decoration.replace({});


export function getParentWithClass(element: HTMLElement, cl: string) {
  let cur: Element | null = element;
  while (cur && cur !== document.body) {
    if (cur.classList.contains(cl)) {
      return cur;
    }
    cur = cur.parentElement;
  }

  return undefined;
}
