// src/index.ts
import { KV_ASSETS, KV_CACHE, AI_BINDING, API, KV_KEYS } from './constants';
import { getParsers } from './rsmv/opdecoder';
import { parseSyntheticOb3 } from './utils/modelParser'; // Import the new parser

export interface Env {
  ASSETS: KVNamespace; // Use KVNamespace for ASSETS
  CACHE_KV: KVNamespace;
  AI: any; // Placeholder for AI binding
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    try {

    // Serve index.html for the root path
    if (url.pathname === '/') {
      const indexHtml = await env.ASSETS.get('index.html', 'text');
      if (indexHtml) {
        return new Response(indexHtml, { headers: { 'Content-Type': 'text/html' } });
      } else {
        return new Response('Index HTML not found', { status: 404 });
      }
    }

    // Handle API routes
    if (url.pathname.startsWith('/api/')) {
      const parsers = await getParsers(env);
      if (url.pathname === API.GET_TYPEDEF) {
        const typedefJSON = await env.CACHE_KV.get(KV_KEYS.TYPEDEF);
        return new Response(typedefJSON || '{}', { headers: { 'Content-Type': 'application/json' } });
      }
      if (url.pathname === API.GET_MODELS) {
        const modelsJSON = await env.CACHE_KV.get(KV_KEYS.MODELS);
        return new Response(modelsJSON || '[]', { headers: { 'Content-Type': 'application/json' } });
      }
      if (url.pathname.startsWith('/api/model/')) {
        const idWithExtension = url.pathname.split('/').pop();
        if (!idWithExtension) return new Response('Model ID required', { status: 400 });
        const id = idWithExtension.replace('.ob3', ''); // Remove .ob3 extension
        console.log(`Attempting to load model with ID: ${id}`);
        const modelKvKey = KV_KEYS.MODEL_OB3(id);
        console.log(`Constructed KV key for model: ${modelKvKey}`);
        const ob3Binary = await env.ASSETS.get(modelKvKey, 'arrayBuffer');
        console.log('ob3Binary from KV:', ob3Binary);
        if (ob3Binary) {
          console.log('ob3Binary byteLength:', ob3Binary.byteLength);
          // Log first 10 bytes for inspection
          const uint8Array = new Uint8Array(ob3Binary);
          console.log('ob3Binary first 10 bytes:', uint8Array.slice(0, 10).join(','));
        }
        if (!ob3Binary) return new Response('Model not found', { status: 404 });

        let parsedModel;
        if (id === '123') {
          // Use the synthetic parser for model ID 123
          parsedModel = parseSyntheticOb3(new Uint8Array(ob3Binary));
        } else {
          // Use the rsmv parser for other models
          parsedModel = await parsers.models.read(new Uint8Array(ob3Binary), { getDecodeArgs: () => ({}) });
        }
        console.log('Parsed Model:', parsedModel); // Add this line for debugging
        return new Response(JSON.stringify(parsedModel), { headers: { 'Content-Type': 'application/json' } });
      }
    }

    // AI Suggestion endpoints
    if (url.pathname === API.AI_SUGGEST_MATERIALS) {
      const body = await request.json();
      // Placeholder: Call AI Binding to get suggestions
      // In a real scenario, you'd pass more context about the model
      const suggestion = await env.AI.suggestMaterials(body.modelId, body.currentMaterials);
      return new Response(JSON.stringify(suggestion), { headers: { 'Content-Type': 'application/json' } });
    }

    if (url.pathname === API.AI_SUGGEST_ANIMATION) {
      const body = await request.json();
      // Placeholder: Call AI Binding to get suggestions
      const suggestion = await env.AI.suggestAnimation(body.modelId, body.currentAnimation);
      return new Response(JSON.stringify(suggestion), { headers: { 'Content-Type': 'application/json' } });
    }

    // Serve static assets from KV
    // This should be the last resort if no other route matches
    const asset = await env.ASSETS.get(url.pathname.substring(1), 'arrayBuffer');
    if (asset) {
      const mimeType = getMimeType(url.pathname);
      return new Response(asset, { headers: { 'Content-Type': mimeType } });
    }

    return new Response('Not Found', { status: 404 }); // Fallback if no other route matches
    } catch (error: any) {
      console.error('Error in fetch handler:', error.message, error.stack);
      return new Response(`Internal Server Error: ${error.message}`, { status: 500 });
    }
  }
};

// Helper function to determine MIME type based on file extension
function getMimeType(pathname: string): string {
  const ext = pathname.split('.').pop();
  switch (ext) {
    case 'html': return 'text/html';
    case 'css': return 'text/css';
    case 'js': return 'application/javascript';
    case 'json': return 'application/json';
    case 'ico': return 'image/x-icon';
    case 'ob3': return 'application/octet-stream'; // For .ob3 model files
    // Add more MIME types as needed
    default: return 'application/octet-stream';
  }
}