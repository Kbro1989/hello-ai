// src/utils/nonwebpack-require.ts
export function nonWebpackRequire(id) {
    // In bundlers that define __non_webpack_require__, use it.
    // Otherwise fall back to runtime require (Node), or dynamic import.
    if (typeof globalThis.__non_webpack_require__ === "function") {
        return globalThis.__non_webpack_require__(id);
    }
    if (typeof require !== "undefined") {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        return require(id);
    }
    // Last resort: dynamic import (may return a module namespace)
    // caller may need to await import
    throw new Error("nonWebpackRequire: cannot resolve module in this runtime");
}
