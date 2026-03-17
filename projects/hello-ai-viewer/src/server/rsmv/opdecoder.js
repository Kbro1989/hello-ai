// import * as fs from "fs";
import * as opcode_reader from "./opcode_reader";
import commentJson from "comment-json";
import typedefJson from "./opcodes/typedef.jsonc";
import cacheindex from "../../generated/cacheindex";
import npcs from "../../generated/npcs";
import items from "../../generated/items";
import objects from "../../generated/objects";
import achievements from "../../generated/achievements";
import mapsquare_tiles from "../../generated/mapsquare_tiles";
import mapsquare_tiles_nxt from "../../generated/mapsquare_tiles_nxt";
import mapsquare_watertiles from "../../generated/mapsquare_watertiles";
import mapsquare_underlays from "../../generated/mapsquare_underlays";
import mapsquare_overlays from "../../generated/mapsquare_overlays";
import mapsquare_locations from "../../generated/mapsquare_locations";
import mapsquare_envs from "../../generated/mapsquare_envs";
import mapzones from "../../generated/mapzones";
import enums from "../../generated/enums";
import mapscenes from "../../generated/mapscenes";
import sequences from "../../generated/sequences";
import framemaps from "../../generated/framemaps";
import frames from "../../generated/frames";
import animgroupconfigs from "../../generated/animgroupconfigs";
import models from "../../generated/models";
import oldmodels from "../../generated/oldmodels";
import classicmodels from "../../generated/classicmodels";
import spotanims from "../../generated/spotanims";
import rootcacheindex from "../../generated/rootcacheindex";
import skeletalanim from "../../generated/skeletalanim";
import materials from "../../generated/materials";
import oldmaterials from "../../generated/oldmaterials";
import quickchatcategories from "../../generated/quickchatcategories";
import quickchatlines from "../../generated/quickchatlines";
import environments from "../../generated/environments";
import avatars from "../../generated/avatars";
import avataroverrides from "../../generated/avataroverrides";
import identitykit from "../../generated/identitykit";
import structs from "../../generated/structs";
import params from "../../generated/params";
import particles_0 from "../../generated/particles_0";
import particles_1 from "../../generated/particles_1";
import audio from "../../generated/audio";
import proctexture from "../../generated/proctexture";
import oldproctexture from "../../generated/oldproctexture";
import maplabels from "../../generated/maplabels";
import cutscenes from "../../generated/cutscenes";
import clientscript from "../../generated/clientscript";
import clientscriptdata from "../../generated/clientscriptdata";
import interfaces from "../../generated/interfaces";
import dbtables from "../../generated/dbtables";
import dbrows from "../../generated/dbrows";
const typedef = commentJson.parse(typedefJson);
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
export const parse = allParsers();
function allParsers() {
    return {
        cacheIndex: FileParser.fromJson(cacheindex),
        npc: FileParser.fromJson(npcs),
        item: FileParser.fromJson(items),
        object: FileParser.fromJson(objects),
        achievement: FileParser.fromJson(achievements),
        mapsquareTiles: FileParser.fromJson(mapsquare_tiles),
        mapsquareTilesNxt: FileParser.fromJson(mapsquare_tiles_nxt),
        mapsquareWaterTiles: FileParser.fromJson(mapsquare_watertiles),
        mapsquareUnderlays: FileParser.fromJson(mapsquare_underlays),
        mapsquareOverlays: FileParser.fromJson(mapsquare_overlays),
        mapsquareLocations: FileParser.fromJson(mapsquare_locations),
        mapsquareEnvironment: FileParser.fromJson(mapsquare_envs),
        mapZones: FileParser.fromJson(mapzones),
        enums: FileParser.fromJson(enums),
        mapscenes: FileParser.fromJson(mapscenes),
        sequences: FileParser.fromJson(sequences), framemaps: FileParser.fromJson(framemaps),
        frames: FileParser.fromJson(frames),
        animgroupConfigs: FileParser.fromJson(animgroupconfigs),
        models: FileParser.fromJson(models),
        oldmodels: FileParser.fromJson(oldmodels),
        classicmodels: FileParser.fromJson(classicmodels),
        spotAnims: FileParser.fromJson(spotanims),
        rootCacheIndex: FileParser.fromJson(rootcacheindex), skeletalAnim: FileParser.fromJson(skeletalanim),
        materials: FileParser.fromJson(materials),
        oldmaterials: FileParser.fromJson(oldmaterials),
        quickchatCategories: FileParser.fromJson(quickchatcategories),
        quickchatLines: FileParser.fromJson(quickchatlines),
        environments: FileParser.fromJson(environments),
        avatars: FileParser.fromJson(avatars),
        avatarOverrides: FileParser.fromJson(avataroverrides),
        identitykit: FileParser.fromJson(identitykit),
        structs: FileParser.fromJson(structs),
        params: FileParser.fromJson(params),
        particles_0: FileParser.fromJson(particles_0),
        particles_1: FileParser.fromJson(particles_1),
        audio: FileParser.fromJson(audio), proctexture: FileParser.fromJson(proctexture),
        oldproctexture: FileParser.fromJson(oldproctexture),
        maplabels: FileParser.fromJson(maplabels),
        cutscenes: FileParser.fromJson(cutscenes),
        clientscript: FileParser.fromJson(clientscript),
        clientscriptdata: FileParser.fromJson(clientscriptdata),
        interfaces: FileParser.fromJson(interfaces),
        dbtables: FileParser.fromJson(dbtables),
        dbrows: FileParser.fromJson(dbrows)
    };
}
