import { decompress } from "./compression";
require("!file-loader?name=generated/[name].[ext]!sql.js/dist/sql-wasm-workerfs.wasm");
let opentables = new Map();
let dbfiles = {};
self.addEventListener("message", async (e) => {
    let id = e.data.id;
    let packet = e.data.packet;
    try {
        switch (packet.type) {
            case "blobs":
                giveBlobs(packet.blobs);
                postMessage({ id });
                break;
            case "getfile":
                let file = await getFile(packet.major, packet.minor, packet.crc);
                postMessage({ id, packet: file }); //TODO transfer the buffer here? is it still in wasm mem?
                break;
            case "getindex":
                let index = await getIndex(packet.major);
                postMessage({ id, packet: index });
                break;
        }
    }
    catch (e) {
        postMessage({ id, error: e.message });
    }
});
function giveBlobs(blobs) {
    Object.assign(dbfiles, blobs);
}
function openTable(major) {
    if (!opentables.get(major)) {
        let file = `js5-${major}.jcache`;
        if (!dbfiles[file]) {
            opentables.delete(major);
            throw new Error(`need file ${file}`);
        }
        let dbprom = require("sql.js/dist/sql-wasm-workerfs.js")().then(sqlite => {
            return new sqlite.Database(dbfiles[file]);
        });
        let dbget = async (query, args) => {
            let db = await dbprom;
            let row = db.exec(query, args);
            if (row.length == 0) {
                throw new Error(`entry not found`);
            }
            let rawres = row[0];
            for (let rawrow of rawres.values) {
                let row = {};
                for (let i = 0; i < rawres.columns.length; i++) {
                    row[rawres.columns[i]] = rawrow[i];
                }
                return row; //limit to just one row like previous api
                // res.push(row);
            }
            // return res;
        };
        let dbrun = dbget;
        opentables.set(major, { dbprom, dbget, dbrun });
    }
    return opentables.get(major);
}
async function getFile(major, minor, crc) {
    let { dbget } = openTable(major);
    let row = await dbget(`SELECT DATA,CRC FROM cache WHERE KEY=?`, [minor]);
    if (typeof crc == "number" && row.CRC != crc) {
        //TODO this is always off by either 1 or 2
        // console.log(`crc from cache (${row.CRC}) did not match requested crc (${crc}) for ${major}.${minor}`);
    }
    let file = Buffer.from(row.DATA.buffer, row.DATA.byteOffset, row.DATA.byteLength);
    // console.log("size",file.byteLength);
    let res = decompress(file);
    return res;
}
// writeFile(major: number, minor: number, file: Buffer) {
// 	let { dbrun } = openTable(major);
// 	let compressed = compressSqlite(file, "zlib");
// 	return dbrun("UPDATE `cache` SET `DATA`=? WHERE `KEY`=?", [compressed, minor]);
// }
// writeFileArchive(index: cache.CacheIndex, files: Buffer[]) {
// 	let arch = cache.packSqliteBufferArchive(files);
// 	return writeFile(index.major, index.minor, arch);
// }
async function getIndex(major) {
    let { dbget } = openTable(major);
    let row = await dbget(`SELECT DATA FROM cache_index`, []);
    let file = Buffer.from(row.DATA.buffer, row.DATA.byteOffset, row.DATA.byteLength);
    return decompress(file);
}
//obsolete since the main process simply just kills the entire thread/environment
function close() {
    for (let table of opentables.values()) {
        table.dbprom.then(q => q.close());
    }
}
