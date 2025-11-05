import { Env as ModelStorageEnv, saveModelData, getModelData } from './modelStorage';
import { getAssetFromKV, mapRequestToAsset } from '@cloudflare/kv-asset-handler';

export interface Env extends ModelStorageEnv {
  __STATIC_CONTENT: KVNamespace;
  AI: any;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const url = new URL(request.url);
      const path = url.pathname;
      // Log request method and path for debugging routing issues
      console.log(`Request received: ${request.method} ${path}`);

      // Handle model saving (POST /models/:id)
      if (request.method === "POST" && path.startsWith("/models/")) {
        const modelId = path.substring("/models/".length);
        try {
          const modelData = await request.json();
          await saveModelData(env, modelId, modelData);

          return new Response(
            JSON.stringify({ message: `Model ${modelId} saved successfully` }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        } catch (error: any) {
          console.error(`Error saving model: ${error.message}`);
          return new Response(
            JSON.stringify({ error: `Error saving model: ${error.message}` }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }

      // Handle model retrieval (GET /models/:id)
      else if (request.method === "GET" && path.startsWith("/models/")) {
        const modelId = path.substring("/models/".length);
        const modelData = await getModelData(env, modelId);

        if (modelData) {
          return new Response(JSON.stringify(modelData), {
            headers: { 'Content-Type': 'application/json' },
          });
        } else {
          return new Response(
            JSON.stringify({ error: `Model ${modelId} not found` }),
            { status: 404, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }

      // Handle AI chat (POST /api/chat)
      else if (request.method === "POST" && path === "/api/chat") {
        try {
          const { message } = await request.json();
          const messages = [
            {
              role: "system",
              content:
                "You are a helpful assistant for managing RuneScape 3D models. You can help list, load, and edit models.",
            },
            { role: "user", content: message },
          ];

          const modelName = "@cf/meta/llama-3.1-8b-instruct";
          const aiResponse = await env.AI.run(modelName, { messages });

          return new Response(JSON.stringify(aiResponse || { response: "No AI response generated." }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (error: any) {
          console.
error(`Error processing AI chat request: ${error.message}`);
          console.error("Full AI error object:", error);
          return new Response(
            JSON.stringify({ error: `AI chat request failed: ${error.message}` }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }

      // Fallback: serve static assets
      return await getAssetFromKV(
        { request, waitUntil: ctx.waitUntil.bind(ctx) } as any,
        { __STATIC_CONTENT: env.__STATIC_CONTENT, mapRequestToAsset }
      );
    } catch (error: any) {
      const pathname = new URL(request.url).pathname;
      console.error(`Unhandled error in fetch handler for ${pathname}: ${error.message}`);
      return new Response(
        JSON.stringify({ error: `Internal Server Error: ${error.message}` }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },
};