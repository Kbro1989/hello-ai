// src/utils/buffer-utils.ts
export function toArrayBufferView(data: unknown): ArrayBufferView {
  // string -> Uint8Array
  if (typeof data === "string") {
    return new TextEncoder().encode(data);
  }

  // Node Buffer
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(data as any)) {
    return new Uint8Array(data as any);
  }

  // TypedArray or DataView
  if (ArrayBuffer.isView(data as any)) {
    return data as ArrayBufferView;
  }

  // ArrayBuffer or SharedArrayBuffer -> view
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }
  if ((globalThis as any).SharedArrayBuffer && data instanceof (globalThis as any).SharedArrayBuffer) {
    return new Uint8Array(data as ArrayBufferLike);
  }

  // fallback empty view
  return new Uint8Array(0);
}

export function toBlobPart(data: unknown): BlobPart {
  // Convert to a BlobPart that TypeScript accepts (ArrayBuffer or ArrayBufferView or string or Blob)
  const v = toArrayBufferView(data);
  return v as BlobPart;
}
