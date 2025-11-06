// src/index.ts
import { KV_ASSETS, KV_CACHE, AI_BINDING, API, KV_KEYS } from './constants';
import { getParsers } from './rsmv/opdecoder';

export interface Env {
  ASSETS: KVNamespace; // Use KVNamespace for ASSETS
  CACHE_KV: KVNamespace;
  AI: any; // Placeholder for AI binding
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

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
        const id = url.pathname.split('/').pop();
        if (!id) return new Response('Model ID required', { status: 400 });
        const ob3Binary = await env.CACHE_KV.get(KV_KEYS.MODEL_OB3(id), 'arrayBuffer');
        if (!ob3Binary) return new Response('Model not found', { status: 404 });

        // Parse the binary data using rsmvParse.models
        const parsedModel = await parsers.models.read(new Uint8Array(ob3Binary));
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