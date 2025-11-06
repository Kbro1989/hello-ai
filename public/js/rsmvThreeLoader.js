import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';

export function createThreeMeshFromRsmvModel(modelData) {
    console.log('Converting modelData to Three.js mesh:', modelData);

    const geometry = new THREE.BufferGeometry();

    // Assuming modelData.vertices is an array of numbers [x1, y1, z1, x2, y2, z2, ...]
    if (modelData.vertices) {
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(modelData.vertices, 3));
    }

    // Assuming modelData.faces is an array of numbers [v1_idx, v2_idx, v3_idx, ...]
    if (modelData.faces) {
        geometry.setIndex(modelData.faces);
    }

    // Calculate normals for proper lighting
    geometry.computeVertexNormals();

    let material;
    // Assuming modelData.colors is an array of numbers [r1, g1, b1, ...]
    if (modelData.colors && modelData.colors.length > 0) {
        // If per-vertex colors are provided
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(modelData.colors, 3));
        material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true });
    } else {
        // Default material if no colors are provided
        material = new THREE.MeshStandardMaterial({ color: 0xcccccc, flatShading: true });
    }

    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
}
