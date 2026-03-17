import { dumpTexture } from "../imgutils";
import { IterableWeakMap, delay } from "../utils";
function texBindingToGetter(gl, target) {
    switch (target) {
        case gl.TEXTURE_2D:
            return gl.TEXTURE_BINDING_2D;
        case gl.TEXTURE_CUBE_MAP:
            return gl.TEXTURE_BINDING_CUBE_MAP;
        case gl.TEXTURE_3D:
            return gl.TEXTURE_BINDING_3D;
        case gl.TEXTURE_2D_ARRAY:
            return gl.TEXTURE_BINDING_2D_ARRAY;
        default:
            console.log(`unkown texture binding ${target}`);
            return -1;
    }
}
function bufBindingToGetter(gl, target) {
    switch (target) {
        case gl.ARRAY_BUFFER:
            return gl.ARRAY_BUFFER_BINDING;
        case gl.ELEMENT_ARRAY_BUFFER:
            return gl.ELEMENT_ARRAY_BUFFER_BINDING;
        case gl.COPY_READ_BUFFER:
            return gl.COPY_READ_BUFFER_BINDING;
        case gl.COPY_WRITE_BUFFER:
            return gl.COPY_WRITE_BUFFER_BINDING;
        case gl.TRANSFORM_FEEDBACK_BUFFER:
            return gl.TRANSFORM_FEEDBACK_BUFFER_BINDING;
        case gl.UNIFORM_BUFFER:
            return gl.UNIFORM_BUFFER_BINDING;
        case gl.PIXEL_PACK_BUFFER:
            return gl.PIXEL_PACK_BUFFER_BINDING;
        case gl.PIXEL_UNPACK_BUFFER:
            return gl.PIXEL_UNPACK_BUFFER_BINDING;
        default:
            return -1;
    }
}
export function hookgltextures() {
    console.log("hooking global gl texture code, this should be turned off in production!");
    let texes = new IterableWeakMap();
    let buffers = new IterableWeakMap();
    let oldbindtexture = WebGL2RenderingContext.prototype.bindTexture;
    let oldtexstorage2d = WebGL2RenderingContext.prototype.texStorage2D;
    let oldbindbuffer = WebGL2RenderingContext.prototype.bindBuffer;
    let oldbufferdata = WebGL2RenderingContext.prototype.bufferData;
    let olddeletebuffer = WebGL2RenderingContext.prototype.deleteBuffer;
    WebGL2RenderingContext.prototype.bindTexture = function (target, tex) {
        oldbindtexture.call(this, target, tex);
        if (tex) {
            texes.getOrInsert(tex, () => ({ ctx: this, width: 0, height: 0 }));
        }
    };
    WebGL2RenderingContext.prototype.texStorage2D = function (target, levels, internalformat, width, height) {
        oldtexstorage2d.call(this, target, levels, internalformat, width, height);
        let tex = this.getParameter(texBindingToGetter(this, target));
        let meta = texes.get(tex);
        if (meta) {
            meta.width = width;
            meta.height = height;
        }
    };
    WebGL2RenderingContext.prototype.bindBuffer = function (target, buffer) {
        oldbindbuffer.call(this, target, buffer);
        if (buffer) {
            buffers.getOrInsert(buffer, () => ({ ctx: this, size: 0 }));
        }
    };
    WebGL2RenderingContext.prototype.bufferData = function (...args) {
        oldbufferdata.call(this, ...args);
        let size = 0;
        if (typeof args[1] == "number") {
            size = args[1];
        }
        else if (typeof args[4] == "number") {
            size = args[4];
        }
        else {
            size = args[1].byteLength;
        }
        let buf = buffers.get(this.getParameter(bufBindingToGetter(this, args[0])));
        if (buf) {
            buf.size = size;
        }
    };
    WebGL2RenderingContext.prototype.deleteBuffer = function (buf) {
        olddeletebuffer.call(this, buf);
        if (buf) {
            buffers.delete(buf);
        }
    };
    function texlist() {
        return [...texes];
    }
    function buflist() {
        return [...buffers];
    }
    let drawtex = [];
    function alltex(size = 64) {
        cleartex();
        let texes = texlist();
        let cols = Math.ceil(1000 / size);
        for (let [i, tex] of texes.entries()) {
            let v = dumptexx(tex, size, size);
            v.style.left = `${(i % cols) * size}px`;
            v.style.top = `${Math.floor(i / cols) * size}px`;
            drawtex.push(v);
        }
    }
    function cleartex() {
        drawtex.forEach(q => q.remove());
        drawtex.length = 0;
    }
    function dumptexx(tex, width = tex[1].width, height = tex[1].height) {
        return dumpTexture(readTextureToImageData(tex[1].ctx, tex[0], width, height));
    }
    globalThis.texlist = texlist;
    globalThis.buflist = buflist;
    globalThis.dumptexx = dumptexx;
    globalThis.alltex = alltex;
    globalThis.cleartex = cleartex;
    function readTextureToImageData(gl, texture, width, height) {
        let boundFramebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING);
        let boundTexture = gl.getParameter(gl.TEXTURE_BINDING_2D);
        var level = 0;
        // Create a framebuffer
        var framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        // Attach the texture to the framebuffer
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, level);
        // Read pixels from the framebuffer
        var pixels = new Uint8Array(width * height * 4); // 4 channels (RGBA)
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        // Restore the initial WebGL state
        gl.bindFramebuffer(gl.FRAMEBUFFER, boundFramebuffer);
        gl.bindTexture(gl.TEXTURE_2D, boundTexture);
        // Cleanup
        gl.deleteFramebuffer(framebuffer);
        // Create ImageData from the pixels
        var imageData = new ImageData(new Uint8ClampedArray(pixels), width, height);
        return imageData;
    }
}
export function createGCTracker(changecb) {
    let inv = new Map();
    let map = new WeakMap();
    let idcount = 0;
    let deleteid = (id) => {
        inv.delete(id);
        changecb();
    };
    let notifier = new FinalizationRegistry(deleteid);
    let add = (obj) => {
        let id = idcount++;
        inv.set(id, new WeakRef(obj));
        notifier.register(obj, id);
        map.set(obj, id);
        changecb();
    };
    let remove = (obj) => {
        deleteid(map.get(obj));
    };
    let checkempty = async () => {
        if (!globalThis.gc) {
            console.warn("can't ensure that GC has ran since the last reference was lost since GC is not exposed in v8");
        }
        else {
            globalThis.gc?.();
            //ensure that we are on a new call stack
            await delay(100);
        }
        for (let entry of inv.values()) {
            if (entry.deref()) {
                return false;
            }
        }
        return true;
    };
    return { add, remove, checkempty, inv };
}
export function registerWebglTracker() {
    console.warn("tracking webgl resource usage");
    let actioncount = 0;
    let lastprint = 0;
    function anyaction() {
        actioncount++;
        if (actioncount % 20 == 0) {
            printstats();
        }
    }
    let printstats = function () {
        if (Date.now() < lastprint + 1000) {
            return;
        }
        lastprint = Date.now();
        console.log("textures", texs.inv.size, "buffers", bufs.inv.size, "varrays", varrays.inv.size);
    };
    let texs = createGCTracker(anyaction);
    let bufs = createGCTracker(anyaction);
    let varrays = createGCTracker(anyaction);
    let createTextureOld = WebGL2RenderingContext.prototype.createTexture;
    WebGL2RenderingContext.prototype.createTexture = function () {
        let tex = createTextureOld.call(this);
        texs.add(tex);
        return tex;
    };
    let deleteTextureOld = WebGL2RenderingContext.prototype.deleteTexture;
    WebGL2RenderingContext.prototype.deleteTexture = function (tex) {
        deleteTextureOld.call(this, tex);
        if (tex) {
            texs.remove(tex);
        }
    };
    let createBufferOld = WebGL2RenderingContext.prototype.createBuffer;
    WebGL2RenderingContext.prototype.createBuffer = function () {
        let buf = createBufferOld.call(this);
        bufs.add(buf);
        return buf;
    };
    let deleteBufferOld = WebGL2RenderingContext.prototype.deleteBuffer;
    WebGL2RenderingContext.prototype.deleteBuffer = function (buf) {
        deleteBufferOld.call(this, buf);
        if (buf) {
            bufs.remove(buf);
        }
    };
    let createVertexArrayOld = WebGL2RenderingContext.prototype.createVertexArray;
    WebGL2RenderingContext.prototype.createVertexArray = function () {
        let varray = createVertexArrayOld.call(this);
        varrays.add(varray);
        return varray;
    };
    let deleteVertexArrayOld = WebGL2RenderingContext.prototype.deleteVertexArray;
    WebGL2RenderingContext.prototype.deleteVertexArray = function (varray) {
        deleteVertexArrayOld.call(this, varray);
        if (varray) {
            varrays.remove(varray);
        }
    };
    return { printstats };
}
