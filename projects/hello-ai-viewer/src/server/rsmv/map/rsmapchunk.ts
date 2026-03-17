// src/rsmv/map/rsmapchunk.ts
import type { ThreeJsSceneElement, ThreeJsSceneElementSource } from "../viewer/threejsrender";

/**
 * Minimal RSMapChunk runtime-compatible shim.
 * The real project likely has a richer implementation — replace when available.
 */

export type RSMapChunkData = {
  sky?: any;
  // add other runtime fields as needed
  [k: string]: any;
};

export class RSMapChunk implements ThreeJsSceneElementSource {
  chunkx: number;
  chunkz: number;
  loaded?: RSMapChunkData;
  chunkdata?: Promise<RSMapChunkData>;
  models: Map<any, { render: Promise<string>; src: string | null }> = new Map();

  constructor(public sceneCache: any, x: number, z: number) {
    this.chunkx = x;
    this.chunkz = z;
    // default lazy chunkdata
    this.chunkdata = Promise.resolve({} as RSMapChunkData);
  }

  static create(sceneCache: any, x: number, z: number, _opts?: any) {
    return new RSMapChunk(sceneCache, x, z);
  }

  // Viewer expects a cleanup method on chunk model instances
  cleanup() {
    // no-op stub; real implementation should release meshes / textures
  }

  setToggles(_: any, __visible?: boolean) {
    // stub for toggles
  }

  // return a simple SVG string for rendering preview
  renderSvg(_size: number, _detailed: boolean): Promise<string> {
    return Promise.resolve(`<svg xmlns="http://www.w3.org/2000/svg"></svg>`);
  }

  // ThreeJsSceneElementSource API — return nothing or empty array
  getSceneElements(): ThreeJsSceneElement | ThreeJsSceneElement[] {
    return [];
  }
}

export default RSMapChunk;
