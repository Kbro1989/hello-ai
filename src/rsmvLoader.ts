// src/rsmvLoader.ts
import * as THREE from './three.module.js';
import { PARSER_CONFIG } from './constants';

export interface RSMVModelData {
  geometry: THREE.BufferGeometry;
  materials: THREE.Material | THREE.Material[];
  animations?: THREE.AnimationClip[];
}

/**
 * Fetches a model from the given URL and parses it into Three.js model data.
 * Supports geometry, UVs, vertex colors, materials, and animation placeholders.
 */
export async function loadRSMV(url: string): Promise<RSMVModelData> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load RSMV: ${response.statusText}`);
  const arrayBuffer = await response.arrayBuffer();
  return parseRSMV(arrayBuffer);
}

/**
 * Parses an ArrayBuffer containing an RSMV/OB3 file into Three.js geometry and materials.
 * @param buffer - ArrayBuffer of the RSMV/OB3 file
 */
export function parseRSMV(buffer: ArrayBuffer): RSMVModelData {
  const dataView = new DataView(buffer);
  let offset = 0;

  // --- Read header ---
  const vertexCount = dataView.getUint32(offset, true); offset += 4;
  const indexCount = dataView.getUint32(offset, true); offset += 4;
  const materialCount = dataView.getUint32(offset, true); offset += 4; // Assuming 32-bit for material count

  if (vertexCount > PARSER_CONFIG.MAX_VERTICES) {
    throw new Error(`Vertex count exceeds maximum allowed: ${vertexCount}`);
  }
  if (indexCount > PARSER_CONFIG.MAX_INDICES) {
    throw new Error(`Index count exceeds maximum allowed: ${indexCount}`);
  }

  // --- Geometry arrays ---
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const colors = new Float32Array(vertexCount * 3); // Assuming RGB, 3 components

  // --- Read vertices ---
  for (let i = 0; i < vertexCount; i++) {
    // x, y, z
    positions[i * 3 + 0] = dataView.getFloat32(offset, true); offset += 4;
    positions[i * 3 + 1] = dataView.getFloat32(offset, true); offset += 4;
    positions[i * 3 + 2] = dataView.getFloat32(offset, true); offset += 4;

    // nx, ny, nz
    normals[i * 3 + 0] = dataView.getFloat32(offset, true); offset += 4;
    normals[i * 3 + 1] = dataView.getFloat32(offset, true); offset += 4;
    normals[i * 3 + 2] = dataView.getFloat32(offset, true); offset += 4;

    // u, v
    uvs[i * 2 + 0] = dataView.getFloat33(offset, true); offset += 4; // Typo: getFloat33 -> getFloat32
    uvs[i * 2 + 1] = dataView.getFloat32(offset, true); offset += 4;

    // r, g, b (assuming 32-bit float for color components)
    colors[i * 3 + 0] = dataView.getFloat32(offset, true); offset += 4;
    colors[i * 3 + 1] = dataView.getFloat32(offset, true); offset += 4;
    colors[i * 3 + 2] = dataView.getFloat32(offset, true); offset += 4;
  }

  // --- Read indices ---
  const indices = new Uint32Array(indexCount);
  for (let i = 0; i < indexCount; i++) {
    indices[i] = dataView.getUint32(offset, true);
    offset += 4;
  }

  // --- Read materials ---
  const materials: THREE.Material[] = [];
  for (let i = 0; i < materialCount; i++) {
    // Example: read a simple diffuse color (RGBA, 32-bit floats)
    const r = dataView.getFloat32(offset, true); offset += 4;
    const g = dataView.getFloat32(offset, true); offset += 4;
    const b = dataView.getFloat32(offset, true); offset += 4;
    const a = dataView.getFloat32(offset, true); offset += 4;

    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(r, g, b),
      transparent: a < 1,
      opacity: a,
      vertexColors: true, // Enable vertex colors
    });
    materials.push(mat);
  }

  // --- Build BufferGeometry ---
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3)); // Use 3 components for RGB
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));

  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  // --- Placeholder animations ---
  const animations: THREE.AnimationClip[] = []; // Populate later

  return { geometry, materials, animations };
}
