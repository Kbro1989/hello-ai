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
    version: version,
    animations: [
      {
        name: "idle",
        frameTime: 0.1, // 10 frames per second
        frames: [
          { vertices: vertices }, // Frame 0: original vertices
          { vertices: vertices.map((v, i) => (i % 3 === 1) ? v + 0.1 * Math.sin(i) : v) }, // Frame 1: slight Y perturbation
          { vertices: vertices.map((v, i) => (i % 3 === 0) ? v + 0.1 * Math.cos(i) : v) }, // Frame 2: slight X perturbation
          { vertices: vertices.map((v, i) => (i % 3 === 2) ? v + 0.1 * Math.sin(i) : v) }, // Frame 3: slight Z perturbation
        ]
      }
    ]
  };

  return { vertices, faces, material, metadata };
}
