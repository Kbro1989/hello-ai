// src/rsmv/viewer/types.d.ts
declare const EngineCache: any;
declare const cacheFileJsonModes: Record<string, any>;
declare function delay(ms: number): Promise<void>;
declare function findParentElement<T extends HTMLElement>(
  el: HTMLElement,
  pred: (el: HTMLElement) => boolean
): T | null;
