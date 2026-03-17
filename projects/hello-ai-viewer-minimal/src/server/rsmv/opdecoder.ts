// import * as fs from "fs";
import * as opcode_reader from "../opcode_reader";
import commentJson from "comment-json";
import type { CacheFileSource } from "../cache";
import * as mapscenes_json from "../../../generated-opcodes/mapscenes.json";
import type { mapscenes } from "../../../generated-opcodes/mapscenes";
import * as typedef_json from "../../../generated-opcodes/typedef.json";
import * as cacheindex_json from "../../../generated-opcodes/cacheindex.json";
import type { cacheindex } from "../../../generated-opcodes/cacheindex";
import * as npcs_json from "../../../generated-opcodes/npcs.json";
import type { npcs } from "../../../generated-opcodes/npcs";
import type { oldmodels } from "./types/oldmodels";

const typedef = commentJson.parse(JSON.stringify(typedef_json)) as any;

//alloc a large static buffer to write data to without knowing the data size
//then copy what we need out of it
//the buffer is reused so it saves a ton of buffer allocs
const scratchbuf = Buffer.alloc(2 * 1024 * 1024);

let bytesleftoverwarncount = 0;

export class FileParser<T> {
	parser: opcode_reader.ChunkParser;
	originalSource: string;
	totaltime = 0;

	static fromJson<T>(jsonObject: string) {
		let opcodeobj = commentJson.parse(jsonObject, undefined, true) as any
		return new FileParser<T>(opcodeobj, jsonObject);
	}

	constructor(opcodeobj: unknown, originalSource?: string) {
		this.parser = opcode_reader.buildParser(null, opcodeobj, typedef as any);
		this.originalSource = originalSource ?? JSON.stringify(opcodeobj, undefined, "\t");
	}

	readInternal(state: opcode_reader.DecodeState) {
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

	read(buffer: Buffer, source: EngineCache, args?: Record<string, any>) {
		let state: opcode_reader.DecodeState = {
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
		return this.readInternal(state) as T;
	}

	write(obj: T, args?: Record<string, any>) {
		let state: opcode_reader.EncodeState = {
			isWrite: true,
			stack: [],
			hiddenstack: [],
			buffer: scratchbuf,
			scan: 0,
			endoffset: scratchbuf.byteLength,
			args: {
				clientVersion: 1000,//TODO
				...args
			}
		};
		this.parser.write(state, obj);
		if (state.scan > state.endoffset) { throw new Error("tried to write file larger than scratchbuffer size"); }
		//append footer data to end of normal data
		state.buffer.copyWithin(state.scan, state.endoffset, scratchbuf.byteLength);
		state.scan += scratchbuf.byteLength - state.endoffset;
		//do the weird prototype slice since we need a copy, not a ref
		let r: Buffer = Uint8Array.prototype.slice.call(scratchbuf, 0, state.scan);
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

export const parse = await (async () => {
	return await allParsers();
})();
async function allParsers() {
	return {
		cacheIndex: FileParser.fromJson<typeof cacheindex>(JSON.stringify(await import("../../../generated-opcodes/cacheindex.json"))),
		npc: FileParser.fromJson<typeof npcs>(JSON.stringify(await import("../../../generated-opcodes/npcs.json"))),
		item: FileParser.fromJson<import("../../../generated-opcodes/items").items>(JSON.stringify(await import("../../../generated-opcodes/items.json"))),
		object: FileParser.fromJson<import("../../../generated-opcodes/objects").objects>(JSON.stringify(await import("../../../generated-opcodes/objects.json"))),
		achievement: FileParser.fromJson<import("../../../generated-opcodes/achievements").achievements>(JSON.stringify(await import("../../../generated-opcodes/achievements.json"))),
		mapsquareTiles: FileParser.fromJson<import("../../../generated-opcodes/mapsquare_tiles").mapsquare_tiles>(JSON.stringify(await import("../../../generated-opcodes/mapsquare_tiles.json"))),
		mapsquareTilesNxt: FileParser.fromJson<import("../../../generated-opcodes/mapsquare_tiles_nxt").mapsquare_tiles_nxt>(JSON.stringify(await import("../../../generated-opcodes/mapsquare_tiles_nxt.json"))),
		mapsquareWaterTiles: FileParser.fromJson<import("../../../generated-opcodes/mapsquare_watertiles").mapsquare_watertiles>(JSON.stringify(await import("../../../generated-opcodes/mapsquare_watertiles.json"))),
		mapsquareUnderlays: FileParser.fromJson<import("../../../generated-opcodes/mapsquare_underlays").mapsquare_underlays>(JSON.stringify(await import("../../../generated-opcodes/mapsquare_underlays.json"))),
		mapsquareOverlays: FileParser.fromJson<import("../../../generated-opcodes/mapsquare_overlays").mapsquare_overlays>(JSON.stringify(await import("../../../generated-opcodes/mapsquare_overlays.json"))),
		mapsquareLocations: FileParser.fromJson<import("../../../generated-opcodes/mapsquare_locations").mapsquare_locations>(JSON.stringify(await import("../../../generated-opcodes/mapsquare_locations.json"))),
		mapsquareEnvironment: FileParser.fromJson<import("../../../generated-opcodes/mapsquare_envs").mapsquare_envs>(JSON.stringify(await import("../../../generated-opcodes/mapsquare_envs.json"))),
		mapZones: FileParser.fromJson<import("../../../generated-opcodes/mapzones").mapzones>(JSON.stringify(await import("../../../generated-opcodes/mapzones.json"))),
		enums: FileParser.fromJson<import("../../../generated-opcodes/enums").enums>(JSON.stringify(await import("../../../generated-opcodes/enums.json"))),
		mapscenes: FileParser.fromJson<import("../../../generated-opcodes/mapscenes").mapscenes>(JSON.stringify(await import("../../../generated-opcodes/mapscenes.json"))),
		sequences: FileParser.fromJson<import("../../../generated-opcodes/sequences").sequences>(JSON.stringify(await import("../../../generated-opcodes/sequences.json"))),
		framemaps: FileParser.fromJson<import("../../../generated-opcodes/framemaps").framemaps>(JSON.stringify(await import("../../../generated-opcodes/framemaps.json"))),
		frames: FileParser.fromJson<import("../../../generated-opcodes/frames").frames>(JSON.stringify(await import("../../../generated-opcodes/frames.json"))),
		animgroupConfigs: FileParser.fromJson<import("../../../generated-opcodes/animgroupconfigs").animgroupconfigs>(JSON.stringify(await import("../../../generated-opcodes/animgroupconfigs.json"))),
		models: FileParser.fromJson<import("../../../generated-opcodes/models").models>(JSON.stringify(await import("../../../generated-opcodes/models.json"))),
		oldmodels: FileParser.fromJson<oldmodels>(JSON.stringify(await import("../../../generated-opcodes/oldmodels.json"))),
		classicmodels: FileParser.fromJson<import("../../../generated-opcodes/classicmodels").classicmodels>(JSON.stringify(await import("../../../generated-opcodes/classicmodels.json"))),
		spotAnims: FileParser.fromJson<import("../../../generated-opcodes/spotanims").spotanims>(JSON.stringify(await import("../../../generated-opcodes/spotanims.json"))),
		rootCacheIndex: FileParser.fromJson<import("../../../generated-opcodes/rootcacheindex").rootcacheindex>(JSON.stringify(await import("../../../generated-opcodes/rootcacheindex.json"))),
		skeletalAnim: FileParser.fromJson<import("../../../generated-opcodes/skeletalanim").skeletalanim>(JSON.stringify(await import("../../../generated-opcodes/skeletalanim.json"))),
		materials: FileParser.fromJson<import("../../../generated-opcodes/materials").materials>(JSON.stringify(await import("../../../generated-opcodes/materials.json"))),
		oldmaterials: FileParser.fromJson<import("../../../generated-opcodes/oldmaterials").oldmaterials>(JSON.stringify(await import("../../../generated-opcodes/oldmaterials.json"))),
		quickchatCategories: FileParser.fromJson<import("../../../generated-opcodes/quickchatcategories").quickchatcategories>(JSON.stringify(await import("../../../generated-opcodes/quickchatcategories.json"))),
		quickchatLines: FileParser.fromJson<import("../../../generated-opcodes/quickchatlines").quickchatlines>(JSON.stringify(await import("../../../generated-opcodes/quickchatlines.json"))),
		environments: FileParser.fromJson<import("../../../generated-opcodes/environments").environments>(JSON.stringify(await import("../../../generated-opcodes/environments.json"))),
		avatars: FileParser.fromJson<import("../../../generated-opcodes/avatars").avatars>(JSON.stringify(await import("../../../generated-opcodes/avatars.json"))),
		avatarOverrides: FileParser.fromJson<import("../../../generated-opcodes/avataroverrides").avataroverrides>(JSON.stringify(await import("../../../generated-opcodes/avataroverrides.json"))),
		identitykit: FileParser.fromJson<import("../../../generated-opcodes/identitykit").identitykit>(JSON.stringify(await import("../../../generated-opcodes/identitykit.json"))),
		structs: FileParser.fromJson<import("../../../generated-opcodes/structs").structs>(JSON.stringify(await import("../../../generated-opcodes/structs.json"))),
		params: FileParser.fromJson<import("../../../generated-opcodes/params").params>(JSON.stringify(await import("../../../generated-opcodes/params.json"))),
		particles_0: FileParser.fromJson<import("../../../generated-opcodes/particles_0").particles_0>(JSON.stringify(await import("../../../generated-opcodes/particles_0.json"))),
		particles_1: FileParser.fromJson<import("../../../generated-opcodes/particles_1").particles_1>(JSON.stringify(await import("../../../generated-opcodes/particles_1.json"))),
		audio: FileParser.fromJson<import("../../../generated-opcodes/audio").audio>(JSON.stringify(await import("../../../generated-opcodes/audio.json"))),
		proctexture: FileParser.fromJson<import("../../../generated-opcodes/proctexture").proctexture>(JSON.stringify(await import("../../../generated-opcodes/proctexture.json"))),
		oldproctexture: FileParser.fromJson<import("../../../generated-opcodes/oldproctexture").oldproctexture>(JSON.stringify(await import("../../../generated-opcodes/oldproctexture.json"))),
		maplabels: FileParser.fromJson<import("../../../generated-opcodes/maplabels").maplabels>(JSON.stringify(await import("../../../generated-opcodes/maplabels.json"))),
		cutscenes: FileParser.fromJson<import("../../../generated-opcodes/cutscenes").cutscenes>(JSON.stringify(await import("../../../generated-opcodes/cutscenes.json"))),
		clientscript: FileParser.fromJson<import("../../../generated-opcodes/clientscript").clientscript>(JSON.stringify(await import("../../../generated-opcodes/clientscript.json"))),
		clientscriptdata: FileParser.fromJson<import("../../../generated-opcodes/clientscriptdata").clientscriptdata>(JSON.stringify(await import("../../../generated-opcodes/clientscriptdata.json"))),
		interfaces: FileParser.fromJson<import("../../../generated-opcodes/interfaces").interfaces>(JSON.stringify(await import("../../../generated-opcodes/interfaces.json"))),
		dbtables: FileParser.fromJson<import("../../../generated-opcodes/dbtables").dbtables>(JSON.stringify(await import("../../../generated-opcodes/dbtables.json"))),
		dbrows: FileParser.fromJson<import("../../../generated-opcodes/dbrows").dbrows>(JSON.stringify(await import("../../../generated-opcodes/dbrows.json")))
	}
}