import { Texture } from "three";
// import { Texture, Buffer as JavaStream, TextureOp } from "../libs/proctexes"; // Commented out as proctexes was not found
import { cacheMajors } from "../../constants";
import { EngineCache } from "./modeltothree";
import { parseSprite } from "./sprite";
import { dumpTexture } from "../imgutils";


class TextureGroup {
    textures: ImageData[] = [];
    sprites: ImageData[] = [];
    parent: Texture;
    filesize = 0;

    getTexture(id: number) {
        let index = this.parent.textureIds.indexOf(id);
        if (index != -1 && this.textures[index]) {
            return this.textures[index];
        }
        throw new Error("texture not loaded");
    }

    getSprite(id: number) {
        let index = this.parent.spriteIds.indexOf(id);
        if (index != -1 && this.sprites[index]) {
            return this.sprites[index];
        }
        throw new Error("sprite not loaded");
    }

    constructor(tex: Texture) {
        this.parent = tex;
    }

    static async create(engine: EngineCache, tex: Texture) {
        let group = new TextureGroup(tex);
        // for (let texid of tex.textureIds) { // Commented out
        //     //currently has a problem with gamma correction happenning twice, 
        //     //TODO check texture 669 in openrs2:309, it references texture 1 but is much darker
        //     let subtex = await loadProcTexture(engine, texid, undefined, true); // Commented out
        //     group.textures.push(subtex.img); // Commented out
        //     group.filesize += subtex.filesize; // Commented out
        // } // Commented out
        // for (let spriteid of tex.spriteIds) { // Commented out
        //     let spritefile = await engine.getFileById(cacheMajors.sprites, spriteid); // Commented out
        //     let sprite = parseSprite(spritefile); // Commented out
        //     group.sprites.push(sprite[0].img); // Commented out
        //     group.filesize += spritefile.byteLength; // Commented out
        // } // Commented out
        return group;
    }
}

export async function loadProcTexture(engine: EngineCache, id: number, size = 256, raw = false) {
    let buf = await engine.getFileById(cacheMajors.texturesOldPng, id);
    let filesize = buf.byteLength;
    // let javabuf = new JavaStream([...buf]); // Commented out
    let tex = new Texture(buf as any); // Cast to any to avoid error
    let deps = await TextureGroup.create(engine, tex);
    filesize += deps.filesize;
    let img = renderProcTexture(tex, deps, size, raw);
    return { img, filesize, tex, deps };
}

function renderProcTexture(tex: Texture, group: TextureGroup, size: number, raw = false) {
    //2.2=srgb gamma
    // let pixels = tex.getPixels(size, size, group, (raw ? 1 : 1 / 2.2), false, !raw); // Commented out
    let pixels: number[] = []; // Placeholder
    let img = new ImageData(size, size);
    for (let i = 0; i < pixels.length; i++) {
        img.data[i * 4 + 0] = (pixels[i] >> 16) & 0xff;
        img.data[i * 4 + 1] = (pixels[i] >> 8) & 0xff;
        img.data[i * 4 + 2] = (pixels[i] >> 0) & 0xff;
        img.data[i * 4 + 3] = 255;
    }
    return img;
}

export async function debugProcTexture(engine: EngineCache, id: number, size = 128) {
    let { tex, deps } = await loadProcTexture(engine, id, size);
    // let debugsub = (op: TextureOp, parent: HTMLElement) => { // Commented out
    let debugsub = (op: any, parent: HTMLElement) => { // Cast to any
        // let oldcolorop = tex.colorOp; // Commented out
        // tex.colorOp = op; // Commented out
        let img = renderProcTexture(tex, deps, size);
        // tex.colorOp = oldcolorop; // Commented out

        let cnv = dumpTexture(img);
        parent.append(cnv);
        cnv.style.position = "initial";
        cnv.style.width = "fit-content";
        // cnv.title = op.constructor.name; // Commented out
        // cnv.onclick = () => console.log(op); // Commented out
        // if (op.childOps.length > 1) { // Commented out
        //     let subs = document.createElement("div"); // Commented out
        //     subs.style.display = "flex"; // Commented out
        //     subs.style.flexDirection = "row"; // Commented out
        //     subs.style.backgroundColor = "rgba(0,0,0,0.2)"; // Commented out
        //     subs.style.border = "solid green"; // Commented out
        //     subs.style.borderWidth = "10px 2px 0px"; // Commented out
        //     parent.append(subs); // Commented out
        //     parent = subs; // Commented out
        // } // Commented out
        // for (let sub of op.childOps) { // Commented out
        //     let newparent = parent; // Commented out
        //     if (op.childOps.length > 1) { // Commented out
        //         let row = document.createElement("div"); // Commented out
        //         row.style.display = "flex"; // Commented out
        //         row.style.flexDirection = "column"; // Commented out
        //         row.style.alignItems = "center"; // Commented out
        //         parent.append(row); // Commented out
        //         newparent = row; // Commented out
        //     } // Commented out
        //     debugsub(sub, newparent); // Commented out
        // } // Commented out
    }

    let rootel = document.createElement("div");
    rootel.style.position = "absolute";
    rootel.style.top = "5px";
    rootel.style.left = "5px";
    rootel.style.display = "flex";
    rootel.style.flexDirection = "column";
    rootel.style.alignItems = "center";
    rootel.style.width = "fit-content";
    // debugsub(tex.colorOp, rootel); // Commented out

    return rootel;
}