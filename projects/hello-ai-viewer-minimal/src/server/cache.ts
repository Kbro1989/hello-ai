export type SubFile = {
    fileid: number;
    buffer: Buffer;
};

export type CacheIndex = {
    major: number;
    minor: number;
    crc: number;
    version: number;
    name?: string;
    subindices: number[];
};

export interface CacheFileSource {
    getDecodeArgs(): Record<string, any>;
    getArchiveById(major: number, minor: number): Promise<SubFile[]>;
    getFile(major: number, minor: number, crc?: number): Promise<Buffer>;
    getCacheIndex(major: number): Promise<CacheIndex[]>;
    getFileArchive(index: CacheIndex): Promise<SubFile[]>;
    getBuildNr(): number;
    findSubfileByName(major: number, minor: number, name: string): Promise<SubFile | null>;
    getIndexEntryById(major: number, minor: number): Promise<CacheIndex>;
    getXteaKey(major: number, minor: number): Uint32Array | undefined;
}
