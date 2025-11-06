import * as opcode_reader from "./opcode_reader";
import type { CacheFileSource } from "cache";

// Removed comment-json import as it's no longer needed for direct parsing here.
// import commentJson from "comment-json";

// Updated imports to point to generated .js files instead of raw .json/.jsonc files.
// The path from src/rsmv/opdecoder.ts to rsmv/generated is '../../rsmv/generated/'
// typedef.jsonc -> typedef.js


// cacheIndex.json -> cacheindex.js
import cacheIndex from "./../../rsmv/generated/cacheindex.js";

// npcs.jsonc -> npcs.js
import npcs from "./../../rsmv/generated/npcs.js";
// items.jsonc -> items.js
import items from "./../../rsmv/generated/items.js";
// objects.jsonc -> objects.js
import objects from "./../../rsmv/generated/objects.js";

// mapsquare_tiles.jsonc -> mapsquare_tiles.js
import mapsquareTiles from "./../../rsmv/generated/mapsquare_tiles.js";
// mapsquare_tiles_nxt.jsonc -> mapsquare_tiles_nxt.js
import mapsquareTilesNxt from "./../../rsmv/generated/mapsquare_tiles_nxt.js";
// mapsquare_watertiles.json -> mapsquare_watertiles.js
import mapsquareWaterTiles from "./../../rsmv/generated/mapsquare_watertiles.js";
// mapsquare_underlays.jsonc -> mapsquare_underlays.js
import mapsquareUnderlays from "./../../rsmv/generated/mapsquare_underlays.js";
// mapsquare_overlays.jsonc -> mapsquare_overlays.js
import mapsquareOverlays from "./../../rsmv/generated/mapsquare_overlays.js";
// mapsquare_locations.json -> mapsquare_locations.js
import mapsquareLocations from "./../../rsmv/generated/mapsquare_locations.js";
// mapsquare_envs.jsonc -> mapsquare_envs.js
import mapsquareEnvironment from "./../../rsmv/generated/mapsquare_envs.js";
// mapzones.json -> mapzones.js
import mapZones from "./../../rsmv/generated/mapzones.js";
// enums.json -> enums.js
import enums from "./../../rsmv/generated/enums.js";
// mapscenes.json -> mapscenes.js
import mapscenes from "./../../rsmv/generated/mapscenes.js";
// sequences.json -> sequences.js
import sequences from "./../../rsmv/generated/sequences.js";
// framemaps.jsonc -> framemaps.js
import framemaps from "./../../rsmv/generated/framemaps.js";
// frames.json -> frames.js
import frames from "./../../rsmv/generated/frames.js";
// animgroupconfigs.jsonc -> animgroupconfigs.js
import animgroupConfigs from "./../../rsmv/generated/animgroupconfigs.js";
// models.jsonc -> models.js

// oldmodels.jsonc -> oldmodels.js
import oldmodels from "./../../rsmv/generated/oldmodels.js";
// classicmodels.jsonc -> classicmodels.js
// Updated import path to point to generated file
import classicmodels from "./../../rsmv/generated/classicmodels.js";
// spotanims.json -> spotanims.js
// Updated import path to point to generated file
import spotAnims from "./../../rsmv/generated/spotanims.js";
// rootcacheindex.jsonc -> rootcacheindex.js
// Updated import path to point to generated file
import rootCacheIndex from "./../../rsmv/generated/rootcacheindex.js";
// skeletalanim.jsonc -> skeletalanim.js
// Updated import path to point to generated file
import skeletalAnim from "./../../rsmv/generated/skeletalanim.js";
// materials.jsonc -> materials.js
import materials from "./../../rsmv/generated/materials.js";
// oldmaterials.jsonc -> oldmaterials.js
import oldmaterials from "./../../rsmv/generated/oldmaterials.js";
// oldproctexture.jsonc -> oldproctexture.js
import oldproctexture from "./../../rsmv/generated/oldproctexture.js";
// quickchatcategories.jsonc -> quickchatcategories.js
import quickchatCategories from "./../../rsmv/generated/quickchatcategories.js";
// quickchatlines.jsonc -> quickchatlines.js
import quickchatLines from "./../../rsmv/generated/quickchatlines.js";
// environments.jsonc -> environments.js
import environments from "./../../rsmv/generated/environments.js";
// avatars.jsonc -> avatars.js
import avatars from "./../../rsmv/generated/avatars.js";
// avataroverrides.jsonc -> avataroverrides.js
import avatarOverrides from "./../../rsmv/generated/avataroverrides.js";
// These were previously failing with require, now updated to ESM imports
import identitykit from "./../../rsmv/generated/identitykit.js";
import structs from "./../../rsmv/generated/structs.js";
import params from "./../../rsmv/generated/params.js";
import particles_0 from "./../../rsmv/generated/particles_0.js";
import particles_1 from "./../../rsmv/generated/particles_1.js";
import audio from "./../../rsmv/generated/audio.js";
import proctexture from "./../../rsmv/generated/proctexture.js";
import oldproctexture from "./../../rsmv/generated/oldproctexture.js";
import maplabels from "./../../rsmv/generated/maplabels.js";
import cutscenes from "./../../rsmv/generated/cutscenes.js";

// clientscript.jsonc -> clientscript.js
import clientScript from "./../../rsmv/generated/clientscript.js";
// clientscriptdata.jsonc -> clientscriptdata.js
import clientScriptData from "./../../rsmv/generated/clientscriptdata.js";
// dbtables.jsonc -> dbtables.js
import dbTables from "./../../rsmv/generated/dbtables.js";
// dbrows.jsonc -> dbrows.js
import dbRows from "./../../rsmv/generated/dbrows.js";
// interfaces.jsonc -> interfaces.js
import interfaces from "./../../rsmv/generated/interfaces.js";


//alloc a large static buffer to write data to without knowing the data size
//then copy what we need out of it
//the buffer is reused so it saves a ton of buffer allocs
const scratchbuf = new Uint8Array(2 * 1024 * 1024);
const scratchdataview = new DataView(scratchbuf.buffer);


let bytesleftoverwarncount = 0;

export class FileParser<T> {
	private parserPromise: Promise<opcode_reader.ChunkParser>;
	totaltime = 0;

    private constructor(parserPromise: Promise<opcode_reader.ChunkParser>) {
        this.parserPromise = parserPromise;
    }

    static async init<T>(opcodeobj: unknown, typedef: opcode_reader.TypeDef): Promise<FileParser<T>> {
        const parser = await opcode_reader.buildParser(null, opcodeobj, typedef);
        return new FileParser<T>(Promise.resolve(parser));
    }

	static fromJson<T>(jsonObject: record): Promise<FileParser<T>> {
		let opcodeobj = jsonObject as any;
		return FileParser.init<T>(opcodeobj);
	}

    async getParser(): Promise<opcode_reader.ChunkParser> {
        return this.parserPromise;
    }

	async readInternal(state: opcode_reader.DecodeState) {
		let t = performance.now();
		const parser = await this.getParser();
		let res = parser.read(state);
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

	read(buffer: Uint8Array, source: CacheFileSource, args?: Record<string, any>) {
        console.log('FileParser.read - source (v2): ', source);
		let state: opcode_reader.DecodeState = {
			isWrite: false,
			buffer,
			dataView: new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength),
			stack: [],
			hiddenstack: [],
			scan: 0,
			endoffset: buffer.byteLength,
			args: {
				...(source && source.getDecodeArgs ? source.getDecodeArgs() : {}),
				...args
			}
		};
		return this.readInternal(state) as T;
	}

	async write(obj: T, args?: Record<string, any>) {
		let state: opcode_reader.EncodeState = {
			isWrite: true,
			stack: [],
			hiddenstack: [],
			buffer: scratchbuf,
			dataView: scratchdataview,
			scan: 0,
			endoffset: scratchbuf.byteLength,
			args: {
				clientVersion: 1000,//TODO
				...args
			}
		};
		const parser = await this.getParser();
		parser.write(state, obj);
		if (state.scan > state.endoffset) { throw new Error("tried to write file larger than scratchbuffer size"); }
		//append footer data to end of normal data
		scratchbuf.copyWithin(state.scan, state.endoffset, scratchbuf.byteLength);
		state.scan += scratchbuf.byteLength - state.endoffset;
		//do the weird prototype slice since we need a copy, not a ref
		let r: Uint8Array = scratchbuf.slice(0, state.scan);
		//clear it for next use
		scratchbuf.fill(0, 0, state.scan);
		return r;
	}
}

globalThis.parserTimings = () => {
	let all = Object.entries(parse).map(q => ({ name: q[0], t: q[1].totaltime }));
	all.sort((a, b) => b.t - a.t);
	all.slice(0, 10).filter(q => q.t > 0.01).forEach(q => console.log(`${q.name} ${q.t.toFixed(3)}s`));
}

// Helper type alias for object literals used in 'fromJson'
type record = Record<string, any>;

import { Env } from '../index'; // Import Env interface

let parsePromise: Promise<ReturnType<typeof allParsers>> | null = null;



export function getParsers(env: Env): Promise<ReturnType<typeof allParsers>> {

    if (parsePromise === null) {

        parsePromise = (async () => {
            // In development, fetch from local server as static assets
            const typedefContent = await env.ASSETS.get('typedef.json', 'json');

            const modelsContent = await env.ASSETS.get('models.json', 'json');

            const modelsFileParser = await FileParser.init<import("../generated/models").models>(modelsContent, typedefContent);

            return { models: modelsFileParser };
        })();

    }

    return parsePromise;

}



// The allParsers function is no longer needed in its original form

// as its logic is now embedded within the getParsers function.

// It can be removed or refactored if still needed for other purposes.

function allParsers(): any {

    return {}; // Placeholder, will be removed or refactored if needed elsewhere

}