// src/utils/buffer-utils.ts
export function toArrayBufferView(data) {
    // string -> Uint8Array
    if (typeof data === "string") {
        return new TextEncoder().encode(data);
    }
    // Node Buffer
    if (typeof Buffer !== "undefined" && Buffer.isBuffer(data)) {
        return new Uint8Array(data);
    }
    // TypedArray or DataView
    if (ArrayBuffer.isView(data)) {
        return data;
    }
    // ArrayBuffer or SharedArrayBuffer -> view
    if (data instanceof ArrayBuffer) {
        return new Uint8Array(data);
    }
    if (globalThis.SharedArrayBuffer && data instanceof globalThis.SharedArrayBuffer) {
        return new Uint8Array(data);
    }
    // fallback empty view
    return new Uint8Array(0);
}
export function toBlobPart(data) {
    // Convert to a BlobPart that TypeScript accepts (ArrayBuffer or ArrayBufferView or string or Blob)
    const v = toArrayBufferView(data);
    return v;
}
