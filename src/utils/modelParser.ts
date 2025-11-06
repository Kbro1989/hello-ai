export function parseSyntheticOb3(buffer: Uint8Array): any {
  const dataView = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  let offset = 0;

  const version = dataView.getUint8(offset);
  offset += 1;

  const vertexCount = dataView.getUint16(offset, true); // true for little-endian
  offset += 2;

  const faceCount = dataView.getUint16(offset, true); // true for little-endian
  offset += 2;

  const vertices: number[] = [];
  for (let i = 0; i < vertexCount * 3; i++) { // 3 components per vertex (x, y, z)
    vertices.push(dataView.getFloat32(offset, true)); // true for little-endian
    offset += 4;
  }

  const faces: number[] = [];
  for (let i = 0; i < faceCount * 3; i++) { // 3 indices per face (triangle)
    faces.push(dataView.getUint16(offset, true)); // true for little-endian
    offset += 2;
  }

  // Default material for the synthetic triangle
  const material = {
    color: 0x00ff00, // Green color
    metalness: 0.1,
    roughness: 0.9
  };

  const metadata = {
    id: 123,
    name: "Synthetic Triangle",
    version: version
  };

  return { vertices, faces, material, metadata };
}
