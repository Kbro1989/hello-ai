import { IRequest, Router } from 'itty-router';
import { parseOb3Model, ModelData } from '../rsmv/rt7model';
import { packedHSL2HSL, HSL2RGB } from '../rsmv/utils';
import { CacheFileSource } from '../rsmv/cache';
import { WorkerCacheFileSource } from '../services/cacheService';
import { Env } from '../index';

const router = Router();

router.get('/api/model/:id', async (request: IRequest, env: Env) => {
    const modelId = request.params?.id;

    try {
        const cacheSource = new WorkerCacheFileSource(env);

        // Fetch the raw model file from a conceptual public/models directory
        // In a real scenario, this would come from a game cache or storage.
        const modelKey = `models/${modelId}.ob3`;
        const rawModelData = await env.ASSETS.get(modelKey, { type: "arrayBuffer" });

        if (!rawModelData) {
            return new Response(`Model ${modelId} not found in KV`, { status: 404 });
        }

        const parsedModel: ModelData = await parseOb3Model(new Uint8Array(rawModelData), cacheSource);

        const simplifiedModel = {
            positions: [],
            colors: [],
            indices: []
        };

        if (parsedModel.meshes && parsedModel.meshes.length > 0) {
            let vertexOffset = 0;
            parsedModel.meshes.forEach(mesh => {
                // Extract positions
                const posBuffer = mesh.attributes.pos.array;
                for (let i = 0; i < posBuffer.length; i++) {
                    simplifiedModel.positions.push(posBuffer[i]);
                }

                // Extract colors
                const colorBuffer = mesh.attributes.color ? mesh.attributes.color.array : null;
                if (colorBuffer) {
                    for (let i = 0; i < colorBuffer.length; i++) {
                        simplifiedModel.colors.push(colorBuffer[i]);
                    }
                } else {
                    // Default to white if no color buffer
                    for (let i = 0; i < mesh.attributes.pos.count; i++) {
                        simplifiedModel.colors.push(255, 255, 255, 255); // RGBA
                    }
                }

                // Extract indices, adjusting for vertex offset
                const indicesBuffer = mesh.indices.array;
                for (let i = 0; i < indicesBuffer.length; i++) {
                    simplifiedModel.indices.push(indicesBuffer[i] + vertexOffset);
                }
                vertexOffset += mesh.attributes.pos.count;
            });
        }

        return new Response(JSON.stringify(simplifiedModel), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        console.error("Error fetching model:", error);
        return new Response(`Error fetching model: ${error.message}`, { status: 500 });
    }
});

router.post('/api/model/save', async (request: IRequest, env: Env) => {
    try {
        const { imageData, metadata } = await request.json();

        if (!imageData || !metadata) {
            return new Response('Missing imageData or metadata', { status: 400 });
        }

        const uniqueId = crypto.randomUUID();
        const imageKey = `saved_models/image/${uniqueId}`;
        const metadataKey = `saved_models/metadata/${uniqueId}`;

        // Store image data (base64 string)
        await env.ASSETS.put(imageKey, imageData);

        // Store metadata (JSON string)
        await env.ASSETS.put(metadataKey, JSON.stringify(metadata));

        return new Response(JSON.stringify({ id: uniqueId, message: 'Model saved successfully' }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        console.error("Error saving model:", error);
        return new Response(`Error saving model: ${error.message}`, { status: 500 });
    }
});

export default router;