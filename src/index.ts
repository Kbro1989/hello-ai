import { getAssetFromKV } from '@cloudflare/kv-asset-handler';
import { AIModelService } from './services/aiModelService';
import { Model3D } from './types/models';

export interface Env {
    ASSETS: KVNamespace;
    AI: any;
}

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        try {
            const aiService = new AIModelService(env.AI);
            const url = new URL(request.url);
            
            // Handle CORS
            if (request.method === 'OPTIONS') {
                return new Response(null, {
                    headers: getCorsHeaders()
                });
            }

            // API endpoints
            if (url.pathname.startsWith('/api/')) {
                return handleApiRequest(url.pathname, request, env, aiService);
            }

            // Serve static assets
            return await getAssetFromKV(
                { request, waitUntil: ctx.waitUntil.bind(ctx) },
                { ASSET_NAMESPACE: env.ASSETS }
            );
        } catch (error: any) {
            return new Response(`Server Error: ${error.message}`, { status: 500 });
        }
    }
};

function getCorsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };
}

async function handleApiRequest(
    path: string,
    request: Request,
    env: Env,
    aiService: AIModelService
): Promise<Response> {
    const modelPrefix = 'models/';

    try {
        // List models
        if (path === '/api/models' && request.method === 'GET') {
            return await listModels(env);
        }

        // Upload model
        if (path === '/api/models' && request.method === 'POST') {
            return await uploadModel(request, env);
        }

        // Evolve model
        if (path.startsWith('/api/models/evolve/') && request.method === 'POST') {
            return await evolveModel(path, request, env, aiService);
        }

        return new Response('Not Found', { status: 404 });
    } catch (error: any) {
        return new Response(`API Error: ${error.message}`, { status: 500 });
    }
}

async function listModels(env: Env): Promise<Response> {
    const models = await env.ASSETS.list({ prefix: 'models/' });
    const modelList = await Promise.all(models.keys.map(async (key) => {
        const metadata = await env.ASSETS.get(`${key.name}.metadata`, 'json');
        return { key: key.name, metadata };
    }));
    return jsonResponse(modelList);
}

async function uploadModel(request: Request, env: Env): Promise<Response> {
    const data = await request.json() as Model3D;
    const key = `models/${crypto.randomUUID()}`;
    
    await env.ASSETS.put(key, JSON.stringify(data.geometry));
    await env.ASSETS.put(`${key}.metadata`, JSON.stringify(data.metadata));
    
    return jsonResponse({ id: key, message: 'Model uploaded successfully' });
}

async function evolveModel(
    path: string,
    request: Request,
    env: Env,
    aiService: AIModelService
): Promise<Response> {
    const modelId = path.split('/').pop();
    const modelData = await env.ASSETS.get(`models/${modelId}`, 'json');
    
    if (!modelData) {
        return new Response('Model not found', { status: 404 });
    }

    const { prompt } = await request.json();
    const evolvedModel = await aiService.evolveModel(modelData, prompt);
    const evolvedKey = `models/${evolvedModel.id}`;
    
    await env.ASSETS.put(evolvedKey, JSON.stringify(evolvedModel.geometry));
    await env.ASSETS.put(`${evolvedKey}.metadata`, JSON.stringify(evolvedModel.metadata));
    
    return jsonResponse({ 
        id: evolvedModel.id, 
        message: 'Model evolved successfully' 
    });
}

function jsonResponse(data: any): Response {
    return new Response(JSON.stringify(data), {
        headers: {
            'Content-Type': 'application/json',
            ...getCorsHeaders()
        }
    });
}
