import * as THREE from 'three';

class SafeReader {
  private view: DataView;
  private offset = 0;

  constructor(private buffer: ArrayBuffer) {
    this.view = new DataView(buffer);
  }

  private ensure(bytes: number) {
    if (this.offset + bytes > this.view.byteLength)
      throw new RangeError(
        `Attempt to read ${bytes} bytes past end (offset ${this.offset}/${this.view.byteLength})`
      );
  }

  readUint8() {
    this.ensure(1);
    return this.view.getUint8(this.offset++);
  }

  readUint16() {
    this.ensure(2);
    const v = this.view.getUint16(this.offset, true);
    this.offset += 2;
    return v;
  }

  readFloat32() {
    this.ensure(4);
    const v = this.view.getFloat32(this.offset, true);
    this.offset += 4;
    return v;
  }

  readString(length: number) {
    this.ensure(length);
    const bytes = new Uint8Array(this.buffer, this.offset, length);
    this.offset += length;
    return new TextDecoder().decode(bytes);
  }

  remaining() {
    return this.view.byteLength - this.offset;
  }
}

export function parseRSMV(arrayBuffer: ArrayBuffer): THREE.Mesh {
  const reader = new SafeReader(arrayBuffer);
  try {
    // Header example: version, vertexCount, faceCount
    const version = reader.readUint8();
    const vertexCount = reader.readUint16();
    const faceCount = reader.readUint16();

    const vertices: number[] = [];
    const faces: number[] = [];

    for (let i = 0; i < vertexCount; i++) {
      const x = reader.readFloat32();
      const y = reader.readFloat32();
      const z = reader.readFloat32();
      vertices.push(x, y, z);
    }

    for (let i = 0; i < faceCount; i++) {
      const a = reader.readUint16();
      const b = reader.readUint16();
      const c = reader.readUint16();
      faces.push(a, b, c);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setIndex(faces);
    geom.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: 0x00ffcc,
      metalness: 0.2,
      roughness: 0.8,
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.userData.version = version;
    mesh.userData.vertexCount = vertexCount;
    mesh.userData.faceCount = faceCount;

    return mesh;
  } catch (err: any) {
    console.error('RSMV parse failed:', err);
    throw err;
  }
}