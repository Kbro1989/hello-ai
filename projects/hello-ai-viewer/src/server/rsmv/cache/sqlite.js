import { nonWebpackRequire } from "../../../utils/nonwebpack-require";
import * as cache from "./index";
import { compressSqlite, decompress } from "../../compression";
import { cacheMajors } from "../../constants";
import * as path from "path";
import * as fs from "fs";
export class GameCacheLoader extends cache.CacheFileSource {
    constructor(cachedir, writable) {
        super();
        this.opentables = new Map();
        this.timestamp = new Date();
        this.cachedir = cachedir || path.resolve(process.env.ProgramData, "jagex/runescape");
        this.writable = !!writable;
    }
    getCacheMeta() {
        return {
            name: `sqlite:${this.cachedir}`,
            descr: "Directly reads NXT cache files.",
            timestamp: this.timestamp
        };
    }
    async generateRootIndex() {
        let files = fs.readdirSync(path.resolve(this.cachedir));
        console.log("using generated cache index file meta, crc size and version missing");
        let majors = [];
        for (let file of files) {
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
    async openTable(major) {
        let sqlite = nonWebpackRequire("sqlite3");
        if (!this.opentables.get(major)) {
            let db = null;
            let indices;
            let readFile;
            let updateFile;
            let readIndexFile;
            let updateIndexFile;
            if (major == cacheMajors.index) {
                indices = this.generateRootIndex();
                readFile = async (minor) => (await this.openTable(minor)).readIndexFile();
                readIndexFile = () => { throw new Error("root index file not accesible for sqlite cache"); };
                updateFile = async (minor, data) => {
                    let table = await this.openTable(minor);
                    return table.updateIndexFile(data);
                };
                updateIndexFile = (data) => { throw new Error("cannot write root index"); };
            }
            else {
                let dbfile = path.resolve(this.cachedir, `js5-${major}.jcache`);
                //need separate throw here since sqlite just crashes instead of throwing
                if (!fs.existsSync(dbfile)) {
                    throw new Error(`cache index ${major} doesn't exist`);
                }
                db = new sqlite.Database(dbfile, this.writable ? sqlite.OPEN_READWRITE : sqlite.OPEN_READONLY);
                let ready = new Promise(done => db.once("open", done));
                let dbget = async (query, args) => {
                    await ready;
                    return new Promise((resolve, reject) => {
                        db.get(query, args, (err, row) => {
                            if (err) {
                                reject(err);
                            }
                            else {
                                resolve(row);
                            }
                        });
                    });
                };
                let dbrun = async (query, args) => {
                    await ready;
                    return new Promise((resolve, reject) => {
                        db.run(query, args, (err, res) => {
                            if (err) {
                                reject(err);
                            }
                            else {
                                resolve(res);
                            }
                        });
                    });
                };
                readFile = (minor) => dbget(`SELECT DATA,CRC FROM cache WHERE KEY=?`, [minor]);
                readIndexFile = () => dbget(`SELECT DATA FROM cache_index`, []);
                updateFile = (minor, data) => dbrun(`UPDATE cache SET DATA=? WHERE KEY=?`, [data, minor]);
                updateIndexFile = (data) => dbrun(`UPDATE cache_index SET DATA=?`, [data]);
                indices = readIndexFile().then(async (row) => {
                    let file = decompress(Buffer.from(row.DATA.buffer, row.DATA.byteOffset, row.DATA.byteLength));
                    return cache.indexBufferToObject(major, file, this);
                });
            }
            this.opentables.set(major, { db, readFile, updateFile, readIndexFile, updateIndexFile, indices });
        }
        return this.opentables.get(major);
    }
    async getFile(major, minor, crc) {
        if (major == cacheMajors.index) {
            return this.getIndexFile(minor);
        }
        let { readFile: getFile } = await this.openTable(major);
        let row = await getFile(minor);
        if (typeof crc == "number" && row.CRC != crc) {
            //TODO this is always off by either 1 or 2
            // console.log(`crc from cache (${row.CRC}) did not match requested crc (${crc}) for ${major}.${minor}`);
        }
        let file = Buffer.from(row.DATA.buffer, row.DATA.byteOffset, row.DATA.byteLength);
        // console.log("size",file.byteLength);
        let res = decompress(file);
        return res;
    }
    async getFileArchive(index) {
        let arch = await this.getFile(index.major, index.minor, index.crc);
        let res = cache.unpackSqliteBufferArchive(arch, index.subindices, index.subnames);
        return res;
    }
    async writeFile(major, minor, file) {
        let table = await this.openTable(major);
        let compressed = compressSqlite(file, "zlib");
        return table.updateFile(minor, compressed);
    }
    async writeFileArchive(major, minor, files) {
        let arch = cache.packSqliteBufferArchive(files);
        return this.writeFile(major, minor, arch);
    }
    async getCacheIndex(major) {
        return (await this.openTable(major)).indices;
    }
    async getIndexFile(major) {
        let row = await (await this.openTable(major)).readIndexFile();
        let file = Buffer.from(row.DATA.buffer, row.DATA.byteOffset, row.DATA.byteLength);
        return decompress(file);
    }
    close() {
        for (let table of this.opentables.values()) {
            table.db?.close();
        }
    }
}
