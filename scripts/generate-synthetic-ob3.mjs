import fs from 'fs';
import path from 'path';

const outputPath = path.resolve(process.cwd(), 'public/models/123.ob3');

// Model data for a simple triangle
const version = 1;
const vertexCount = 3;
const faceCount = 1;

const vertices = [
  0.0, 0.0, 0.0, // Vertex 0
  1.0, 0.0, 0.0, // Vertex 1
  0.0, 1.0, 0.0  // Vertex 2
];

const faces = [
  0, 1, 2 // Face 0 (triangle connecting vertices 0, 1, 2)
];

// Calculate buffer size
const bufferSize = 1 + 2 + 2 + (vertices.length * 4) + (faces.length * 2);
const buffer = Buffer.alloc(bufferSize);

let offset = 0;

// Write version (Uint8)
buffer.writeUInt8(version, offset);
offset += 1;

// Write vertexCount (Uint16)
buffer.writeUInt16LE(vertexCount, offset);
offset += 2;

// Write faceCount (Uint16)
buffer.writeUInt16LE(faceCount, offset);
offset += 2;

// Write vertices (Float32)
for (let i = 0; i < vertices.length; i++) {
  buffer.writeFloatLE(vertices[i], offset);
  offset += 4;
}

// Write faces (Uint16)
for (let i = 0; i < faces.length; i++) {
  buffer.writeUInt16LE(faces[i], offset);
  offset += 2;
}

fs.writeFileSync(outputPath, buffer);

console.log(`Synthetic 123.ob3 generated at ${outputPath} with ${buffer.length} bytes.`);
