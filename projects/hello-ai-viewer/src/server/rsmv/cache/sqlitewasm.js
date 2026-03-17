import { cacheMajors } from "../../constants";
import * as cache from "./index";
export class WasmGameCacheLoader extends cache.CacheFileSource {
    constructor() {
        super();
        this.indices = new Map();
        this.dbfiles = {};
        this.msgidcounter = 1;
        this.callbacks = new Map();
        this.timestamp = new Date();
        //@ts-ignore this whole line gets consumed by webpack, turns to static string in webpack
        this.worker = new Worker(new URL("./sqlitewasmworker.ts", import.meta.url));
        this.worker.onmessage = e => {
            let handler = this.callbacks.get(e.data.id);
            if (e.data.error) {
                if (handler) {
                    let err = e.data.error;
                    if (handler.reqpacket.type == "getfile") {
                        err += `\n in getfile ${handler.reqpacket.major}.${handler.reqpacket.minor}`;
                    }
                    else if (handler.reqpacket.type == "getindex") {
                        err += `\n in getindex ${handler.reqpacket.major}`;
                    }
                    else {
                        err += `\n in other ${handler.reqpacket.type}`;
                    }
                    handler.reject(new Error(err));
                }
            }
            else {
                handler?.resolve(e.data.packet);
            }
            this.callbacks.delete(e.data.id);
        };
    }
    getCacheMeta() {
        return {
            name: `sqlitewasm`,
            descr: "Direclty loads NXT cache files from the disk, in browser compatible environment.",
            timestamp: this.timestamp
        };
    }
    async generateRootIndex() {
        console.log("using generated cache index file meta, crc size and version missing");
        let majors = [];
        for (let file of Object.keys(this.dbfiles)) {
            let m = file.match(/js5-(\d+)\.jcache$/);
            if (m) {
                majors[m[1]] = {
                    major: cacheMajors.index,
                    minor: +m[1],
                    crc: 0,
                    size: 0,
                    subindexcount: 1,
                    subindices: [0],
                    version: 0,
                    uncompressed_crc: 0,
                    uncompressed_size: 0
                };
            }
        }
        return majors;
    }
    sendWorker(packet) {
        let id = this.msgidcounter++;
        this.worker.postMessage({ id, packet });
        return new Promise((resolve, reject) => this.callbacks.set(id, { resolve, reject, reqpacket: packet }));
    }
    giveBlobs(blobs) {
        Object.assign(this.dbfiles, blobs);
        this.sendWorker({ type: "blobs", blobs });
    }
    async giveFsDirectory(dir) {
        let files = {};
        if (await dir.queryPermission() != "granted") {
            console.log("tried to open cache without permission");
            return null;
        }
        // await source.handle.requestPermission();
        for await (let filehandle of dir.values()) {
            if (filehandle.kind == "file") {
                let file = filehandle;
                files[file.name] = await file.getFile();
            }
        }
        this.giveBlobs(files);
    }
    async getFile(major, minor, crc) {
        if (major == cacheMajors.index) {
            return this.getIndexFile(minor);
        }
        let data = await this.sendWorker({ type: "getfile", major, minor, crc });
        return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    }
    async getFileArchive(index) {
        let arch = await this.getFile(index.major, index.minor, index.crc);
        return cache.unpackSqliteBufferArchive(arch, index.subindices, index.subnames);
    }
    async getCacheIndex(major) {
        if (major == cacheMajors.index) {
            return this.generateRootIndex();
        }
        let index = this.indices.get(major);
        if (!index) {
            index = this.getIndexFile(major).then(file => cache.indexBufferToObject(major, file, this));
            this.indices.set(major, index);
        }
        return index;
    }
    async getIndexFile(major) {
        let data = await this.sendWorker({ type: "getindex", major });
        return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    }
    close() {
        //TODO this will break if we are doing writes
        this.worker.terminate();
    }
}
