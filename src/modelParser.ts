import * as opcode_reader from './rsmv/opcode_reader';
import commentJson from 'comment-json';
import type { CacheFileSource } from './rsmv/cache';
import { parse as rsmvParse } from './rsmv/opdecoder';

// Re-export the parse object from rsmv/opdecoder.ts
export const parse = rsmvParse;

// The FileParser class is no longer needed here as it's handled by rsmv/opdecoder.ts
// However, if there are other parsers specific to hello-ai, they would go here.
// For now, we'll keep a minimal FileParser if it's still referenced elsewhere,
// but its primary function for models is now delegated.

// If FileParser is still needed for other types, it would look something like this:
/*
export class FileParser<T> {
    parser: opcode_reader.ChunkParser;
    originalSource: string;
    totaltime = 0;

    static fromJson<T>(jsonObject: string) {
        let opcodeobj = commentJson.parse(jsonObject, undefined, true) as any;
        return new FileParser<T>(opcodeobj, jsonObject);
    }

    constructor(opcodeobj: unknown, originalSource?: string) {
        this.parser = opcode_reader.buildParser(null, opcodeobj, rsmvParse.typedef as any); // Assuming typedef is exposed
        this.originalSource = originalSource ?? JSON.stringify(opcodeobj, undefined, "\t");
    }

    read(buffer: Buffer, source: CacheFileSource, args?: Record<string, any>) {
        let state: opcode_reader.DecodeState = {
            isWrite: false,
            buffer,
            stack: [],
            hiddenstack: [],
            scan: 0,
            endoffset: buffer.byteLength,
            args: {
                ...source.getDecodeArgs(),
                ...args,
            },
        };
        return this.parser.read(state) as T;
    }
}
*/
