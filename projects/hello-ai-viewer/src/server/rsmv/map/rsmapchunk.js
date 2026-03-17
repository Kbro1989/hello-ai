export class RSMapChunk {
    constructor(sceneCache, x, z) {
        this.sceneCache = sceneCache;
        this.models = new Map();
        this.chunkx = x;
        this.chunkz = z;
        // default lazy chunkdata
        this.chunkdata = Promise.resolve({});
    }
    static create(sceneCache, x, z, _opts) {
        return new RSMapChunk(sceneCache, x, z);
    }
    // Viewer expects a cleanup method on chunk model instances
    cleanup() {
        // no-op stub; real implementation should release meshes / textures
    }
    setToggles(_, __visible) {
        // stub for toggles
    }
    // return a simple SVG string for rendering preview
    renderSvg(_size, _detailed) {
        return Promise.resolve(`<svg xmlns="http://www.w3.org/2000/svg"></svg>`);
    }
    // ThreeJsSceneElementSource API — return nothing or empty array
    getSceneElements() {
        return [];
    }
}
export default RSMapChunk;
