import type { CacheFileSource } from './rsmv/cache';
import { parse as rsmvParse } from './rsmv/opdecoder';

// Re-export the parse object from rsmv/opdecoder.ts
export const parse = rsmvParse;


