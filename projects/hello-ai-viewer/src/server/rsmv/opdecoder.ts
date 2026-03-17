// import * as fs from "fs";
import * as opcode_reader from "./opcode_reader";
import commentJson from "comment-json";
import type { CacheFileSource } from "cache";

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

const typedef = commentJson.parse(typedefJson) as any;

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

export const parse = allParsers();
function allParsers() {
	return {
		cacheIndex: FileParser.fromJson<import("generated/cacheindex").cacheindex>(cacheindex),
		npc: FileParser.fromJson<import("generated/npcs").npcs>(npcs),
		item: FileParser.fromJson<import("generated/items").items>(items),
		object: FileParser.fromJson<import("generated/objects").objects>(objects),
		achievement: FileParser.fromJson<import("generated/achievements").achievements>(achievements),
		mapsquareTiles: FileParser.fromJson<import("generated/mapsquare_tiles").mapsquare_tiles>(mapsquare_tiles),
		mapsquareTilesNxt: FileParser.fromJson<import("generated/mapsquare_tiles_nxt").mapsquare_tiles_nxt>(mapsquare_tiles_nxt),
		mapsquareWaterTiles: FileParser.fromJson<import("generated/mapsquare_watertiles").mapsquare_watertiles>(mapsquare_watertiles),
		mapsquareUnderlays: FileParser.fromJson<import("generated/mapsquare_underlays").mapsquare_underlays>(mapsquare_underlays),
		mapsquareOverlays: FileParser.fromJson<import("generated/mapsquare_overlays").mapsquare_overlays>(mapsquare_overlays),
		mapsquareLocations: FileParser.fromJson<import("generated/mapsquare_locations").mapsquare_locations>(mapsquare_locations),
		mapsquareEnvironment: FileParser.fromJson<import("generated/mapsquare_envs").mapsquare_envs>(mapsquare_envs),
		mapZones: FileParser.fromJson<import("generated/mapzones").mapzones>(mapzones),
		enums: FileParser.fromJson<import("generated/enums").enums>(enums),
		mapscenes: FileParser.fromJson<import("generated/mapscenes").mapscenes>(mapscenes),
		        sequences: FileParser.fromJson<import("generated/sequences").sequences>(sequences),		framemaps: FileParser.fromJson<import("generated/framemaps").framemaps>(framemaps),
		frames: FileParser.fromJson<import("generated/frames").frames>(frames),
		animgroupConfigs: FileParser.fromJson<import("generated/animgroupconfigs").animgroupconfigs>(animgroupconfigs),
		models: FileParser.fromJson<import("generated/models").models>(models),
		oldmodels: FileParser.fromJson<import("generated/oldmodels").oldmodels>(oldmodels),
		classicmodels: FileParser.fromJson<import("generated/classicmodels").classicmodels>(classicmodels),
		spotAnims: FileParser.fromJson<import("generated/spotanims").spotanims>(spotanims),
		        rootCacheIndex: FileParser.fromJson<import("generated/rootcacheindex").rootcacheindex>(rootcacheindex),		skeletalAnim: FileParser.fromJson<import("generated/skeletalanim").skeletalanim>(skeletalanim),
		materials: FileParser.fromJson<import("generated/materials").materials>(materials),
		oldmaterials: FileParser.fromJson<import("generated/oldmaterials").oldmaterials>(oldmaterials),
		quickchatCategories: FileParser.fromJson<import("generated/quickchatcategories").quickchatcategories>(quickchatcategories),
		quickchatLines: FileParser.fromJson<import("generated/quickchatlines").quickchatlines>(quickchatlines),
		environments: FileParser.fromJson<import("generated/environments").environments>(environments),
		avatars: FileParser.fromJson<import("generated/avatars").avatars>(avatars),
		avatarOverrides: FileParser.fromJson<import("generated/avataroverrides").avataroverrides>(avataroverrides),
		identitykit: FileParser.fromJson<import("generated/identitykit").identitykit>(identitykit),
		structs: FileParser.fromJson<import("generated/structs").structs>(structs),
		params: FileParser.fromJson<import("generated/params").params>(params),
		particles_0: FileParser.fromJson<import("generated/particles_0").particles_0>(particles_0),
		particles_1: FileParser.fromJson<import("generated/particles_1").particles_1>(particles_1),
		        audio: FileParser.fromJson<import("generated/audio").audio>(audio),		proctexture: FileParser.fromJson<import("generated/proctexture").proctexture>(proctexture),
		oldproctexture: FileParser.fromJson<import("generated/oldproctexture").oldproctexture>(oldproctexture),
		maplabels: FileParser.fromJson<import("generated/maplabels").maplabels>(maplabels),
		cutscenes: FileParser.fromJson<import("generated/cutscenes").cutscenes>(cutscenes),
		clientscript: FileParser.fromJson<import("generated/clientscript").clientscript>(clientscript),
		clientscriptdata: FileParser.fromJson<import("generated/clientscriptdata").clientscriptdata>(clientscriptdata),
		interfaces: FileParser.fromJson<import("generated/interfaces").interfaces>(interfaces),
		dbtables: FileParser.fromJson<import("generated/dbtables").dbtables>(dbtables),
		dbrows: FileParser.fromJson<import("generated/dbrows").dbrows>(dbrows)
	}
}
