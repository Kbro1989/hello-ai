// import * as fs from "fs";
import * as opcode_reader from "../opcode_reader";
import commentJson from "comment-json";
import * as typedef_json from "generated-opcodes/typedef.json";
const typedef = commentJson.parse(JSON.stringify(typedef_json));
//alloc a large static buffer to write data to without knowing the data size
//then copy what we need out of it
//the buffer is reused so it saves a ton of buffer allocs
const scratchbuf = Buffer.alloc(2 * 1024 * 1024);
let bytesleftoverwarncount = 0;
export class FileParser {
    static fromJson(jsonObject) {
        let opcodeobj = commentJson.parse(jsonObject, undefined, true);
        return new FileParser(opcodeobj, jsonObject);
    }
    constructor(opcodeobj, originalSource) {
        this.totaltime = 0;
        this.parser = opcode_reader.buildParser(null, opcodeobj, typedef);
        this.originalSource = originalSource ?? JSON.stringify(opcodeobj, undefined, "\t");
    }
    readInternal(state) {
        let t = performance.now();
        let res = this.parser.read(state);
        this.totaltime += performance.now() - t;
        if (state.scan != state.endoffset) {
            bytesleftoverwarncount++;
            if (bytesleftoverwarncount < 100) {
                console.log(`bytes left over after decoding file: ${state.endoffset - state.scan}`);
                // let name = `cache/bonusbytes-${Date.now()}.bin`;
                // require("fs").writeFileSync(name, scanbuf.slice(scanbuf.scan));
            }
            if (bytesleftoverwarncount == 100) {
                console.log("too many bytes left over warning, no more warnings will be logged");
            }
            // TODO remove this stupid condition, needed this to fail only in some situations
            if (state.buffer.byteLength < 100000) {
                throw new Error(`bytes left over after decoding file: ${state.endoffset - state.scan}`);
            }
        }
        return res;
    }
    read(buffer, source, args) {
        let state = {
            isWrite: false,
            buffer,
            stack: [],
            hiddenstack: [],
            scan: 0,
            endoffset: buffer.byteLength,
            args: {
                ...source.getDecodeArgs(),
                ...args
            }
        };
        return this.readInternal(state);
    }
    write(obj, args) {
        let state = {
            isWrite: true,
            stack: [],
            hiddenstack: [],
            buffer: scratchbuf,
            scan: 0,
            endoffset: scratchbuf.byteLength,
            args: {
                clientVersion: 1000, //TODO
                ...args
            }
        };
        this.parser.write(state, obj);
        if (state.scan > state.endoffset) {
            throw new Error("tried to write file larger than scratchbuffer size");
        }
        //append footer data to end of normal data
        state.buffer.copyWithin(state.scan, state.endoffset, scratchbuf.byteLength);
        state.scan += scratchbuf.byteLength - state.endoffset;
        //do the weird prototype slice since we need a copy, not a ref
        let r = Uint8Array.prototype.slice.call(scratchbuf, 0, state.scan);
        //clear it for next use
        scratchbuf.fill(0, 0, state.scan);
        return r;
    }
}
globalThis.parserTimings = () => {
    let all = Object.entries(parse).map(q => ({ name: q[0], t: q[1].totaltime }));
    all.sort((a, b) => b.t - a.t);
    all.slice(0, 10).filter(q => q.t > 0.01).forEach(q => console.log(`${q.name} ${q.t.toFixed(3)}s`));
};
export const parse = await (async () => {
    return await allParsers();
})();
async function allParsers() {
    return {
        cacheIndex: FileParser.fromJson(JSON.stringify(await import("generated-opcodes/cacheindex.json"))),
        npc: FileParser.fromJson(JSON.stringify(await import("generated-opcodes/npcs.json"))),
        item: FileParser.fromJson(JSON.stringify(await import("generated-opcodes/items.json"))),
        object: FileParser.fromJson(JSON.stringify(await import("generated-opcodes/objects.json"))),
        achievement: FileParser.fromJson(JSON.stringify(await import("generated-opcodes/achievements.json"))),
        mapsquareTiles: FileParser.fromJson(JSON.stringify(await import("generated-opcodes/mapsquare_tiles.json"))),
        mapsquareTilesNxt: FileParser.fromJson(JSON.stringify(await import("generated-opcodes/mapsquare_tiles_nxt.json"))),
        mapsquareWaterTiles: FileParser.fromJson(JSON.stringify(await import("generated-opcodes/mapsquare_watertiles.json"))),
        mapsquareUnderlays: FileParser.fromJson(JSON.stringify(await import("generated-opcodes/mapsquare_underlays.json"))),
        mapsquareOverlays: FileParser.fromJson(JSON.stringify(await import("generated-opcodes/mapsquare_overlays.json"))),
        mapsquareLocations: FileParser.fromJson(JSON.stringify(await import("generated-opcodes/mapsquare_locations.json"))),
        mapsquareEnvironment: FileParser.fromJson(JSON.stringify(await import("generated-opcodes/mapsquare_envs.json"))),
        mapZones: FileParser.fromJson(JSON.stringify(await import("generated-opcodes/mapzones.json"))),
        enums: FileParser.fromJson(JSON.stringify(await import("generated-opcodes/enums.json"))),
        mapscenes: FileParser.fromJson(JSON.stringify(await import("generated-opcodes/mapscenes.json"))),
        sequences: FileParser.fromJson(JSON.stringify(await import("generated-opcodes/sequences.json"))),
        framemaps: FileParser.fromJson(JSON.stringify(await import("generated-opcodes/framemaps.json"))),
        frames: FileParser.fromJson(JSON.stringify(await import("generated-opcodes/frames.json"))),
        animgroupConfigs: FileParser.fromJson(JSON.stringify(await import("generated-opcodes/animgroupconfigs.json"))),
        models: FileParser.fromJson(JSON.stringify(await import("generated-opcodes/models.json"))),
        oldmodels: FileParser.fromJson(JSON.stringify(await import("generated-opcodes/oldmodels.json"))),
        classicmodels: FileParser.fromJson(JSON.stringify(await import("generated-opcodes/classicmodels.json"))),
        spotAnims: FileParser.fromJson(JSON.stringify(await import("generated-opcodes/spotanims.json"))),
        rootCacheIndex: FileParser.fromJson(JSON.stringify(await import("generated-opcodes/rootcacheindex.json"))),
        skeletalAnim: FileParser.fromJson(JSON.stringify(await import("generated-opcodes/skeletalanim.json"))),
        materials: FileParser.fromJson(JSON.stringify(await import("generated-opcodes/materials.json"))),
        oldmaterials: FileParser.fromJson(JSON.stringify(await import("generated-opcodes/oldmaterials.json"))),
        quickchatCategories: FileParser.fromJson(JSON.stringify(await import("generated-opcodes/quickchatcategories.json"))),
        quickchatLines: FileParser.fromJson(JSON.stringify(await import("generated-opcodes/quickchatlines.json"))),
        environments: FileParser.fromJson(JSON.stringify(await import("generated-opcodes/environments.json"))),
        avatars: FileParser.fromJson(JSON.stringify(await import("generated-opcodes/avatars.json"))),
        avatarOverrides: FileParser.fromJson(JSON.stringify(await import("generated-opcodes/avataroverrides.json"))),
        identitykit: FileParser.fromJson(JSON.stringify(await import("generated-opcodes/identitykit.json"))),
        structs: FileParser.fromJson(JSON.stringify(await import("generated-opcodes/structs.json"))),
        params: FileParser.fromJson(JSON.stringify(await import("generated-opcodes/params.json"))),
        particles_0: FileParser.fromJson(JSON.stringify(await import("generated-opcodes/particles_0.json"))),
        particles_1: FileParser.fromJson(JSON.stringify(await import("generated-opcodes/particles_1.json"))),
        audio: FileParser.fromJson(JSON.stringify(await import("generated-opcodes/audio.json"))),
        proctexture: FileParser.fromJson(JSON.stringify(await import("generated-opcodes/proctexture.json"))),
        oldproctexture: FileParser.fromJson(JSON.stringify(await import("generated-opcodes/oldproctexture.json"))),
        maplabels: FileParser.fromJson(JSON.stringify(await import("generated-opcodes/maplabels.json"))),
        cutscenes: FileParser.fromJson(JSON.stringify(await import("generated-opcodes/cutscenes.json"))),
        clientscript: FileParser.fromJson(JSON.stringify(await import("generated-opcodes/clientscript.json"))),
        clientscriptdata: FileParser.fromJson(JSON.stringify(await import("generated-opcodes/clientscriptdata.json"))),
        interfaces: FileParser.fromJson(JSON.stringify(await import("generated-opcodes/interfaces.json"))),
        dbtables: FileParser.fromJson(JSON.stringify(await import("generated-opcodes/dbtables.json"))),
        dbrows: FileParser.fromJson(JSON.stringify(await import("generated-opcodes/dbrows.json")))
    };
}
