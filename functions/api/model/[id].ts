import { parseRSMV } from '../../../src/rsmvLoader';

export const onRequestGet: PagesFunction = async (context) => {
  const id = context.params.id;
  const { CACHE_KV } = context.env;

  try {
    const key = `models/${id}.ob3`;
    const modelBuffer = await CACHE_KV.get(key, 'arrayBuffer');

    if (!modelBuffer) {
      return new Response(`Model ${id} not found`, { status: 404 });
    }

    const mesh = parseRSMV(modelBuffer);

    // Extract data from the THREE.Mesh for JSON serialization
    const geometry = mesh.geometry as THREE.BufferGeometry;
    const material = mesh.material as THREE.MeshStandardMaterial;

    const modelJson = {
      metadata: {
        version: mesh.userData.version,
        vertexCount: mesh.userData.vertexCount,
        faceCount: mesh.userData.faceCount,
      },
      vertices: Array.from(geometry.attributes.position.array),
      faces: Array.from(geometry.index ? geometry.index.array : []),
      material: {
        color: material.color.getHex(),
        metalness: material.metalness,
        roughness: material.roughness,
      },
    };

    return new Response(JSON.stringify(modelJson), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Parse error', err);
    return new Response(`Model parsing failed: ${err.message}`, { status: 500 });
  }
};