export interface Model3D {
    id: string;
    name: string;
    format: ModelFormat;
    geometry: THREE.BufferGeometry;
    textures?: ModelTextures;
    metadata: ModelMetadata;
    evolution?: EvolutionData;
}

export type ModelFormat = 'gltf' | 'obj' | 'fbx' | 'json';

export interface ModelTextures {
    diffuse?: TextureMap;
    normal?: TextureMap;
    roughness?: TextureMap;
    metalness?: TextureMap;
}

export interface TextureMap {
    id: string;
    data: string;
    resolution: [number, number];
    format: 'png' | 'jpg' | 'webp';
}

export interface ModelMetadata {
    created: string;
    modified: string;
    version: number;
    parent?: string;
    tags: string[];
    stats: {
        vertices: number;
        faces: number;
        materials: number;
    };
}

export interface EvolutionData {
    generation: number;
    parentId: string;
    prompt: string;
    changes: ModelChange[];
    timestamp: string;
}

export interface ModelChange {
    type: 'geometry' | 'texture' | 'optimization';
    description: string;
    params: Record<string, any>;
}