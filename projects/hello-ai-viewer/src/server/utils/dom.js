// src/utils/dom.ts
export function findParentElement(el, predicate) {
    while (el) {
        if (predicate(el))
            return el;
        el = el.parentElement;
    }
    return null;
}
