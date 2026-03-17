// src/utils/dom.ts
export function findParentElement<T extends HTMLElement>(
  el: HTMLElement | null,
  predicate: (el: HTMLElement) => boolean
): T | null {
  while (el) {
    if (predicate(el)) return el as T;
    el = el.parentElement;
  }
  return null;
}
