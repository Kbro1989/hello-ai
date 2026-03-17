import { Router } from 'itty-router';
const router = Router();
// Basic route for the worker
router.get("/", (request, env, ctx) => {
    return new Response("Hello from the AI-assisted 3D Model Viewer Worker!");
});
// Route for AI inference
router.post("/ai/inference", async (request, env, ctx) => {
    try {
        const { model, inputs } = await request.json();
        const response = await env.AI.run(model, inputs);
        return new Response(JSON.stringify(response), { headers: { 'Content-Type': 'application/json' } });
    }
    catch (error) {
        return new Response(error.message || "AI inference failed", { status: 500 });
    }
});
// New route for AI to describe a 3D model
router.post("/ai/describe-model", async (request, env, ctx) => {
    try {
        const { modelId } = await request.json();
        // Placeholder for fetching model data.
        // In a real scenario, you would fetch the 3D model data (e.g., from KV, R2, or an external API)
        // and extract relevant features (e.g., vertex count, material properties, bounding box)
        // to feed into the AI model.
        const modelDescriptionInput = `Describe a 3D model with ID ${modelId}. It is a RuneScape model.`;
        const aiResponse = await env.AI.run("@cf/meta/llama-2-7b-chat-int8", // Example AI model
        {
            prompt: modelDescriptionInput,
            max_tokens: 200,
        });
        return new Response(JSON.stringify(aiResponse), { headers: { 'Content-Type': 'application/json' } });
    }
    catch (error) {
        return new Response(error.message || "Failed to describe model with AI", { status: 500 });
    }
});
// Route for Durable Object (if needed in the future)
// router.all("/do/*", durable(
//     "MY_DURABLE_OBJECT",
//     (request: IRequest, env: Env) => env.MY_DURABLE_OBJECT
// ));
export default {
    async fetch(request, env, ctx) {
        // Handle static asset requests first
        const response = await env.ASSETS.fetch(request);
        if (response.status !== 404) {
            return response;
        }
        // If not a static asset, route to worker logic
        return router.handle(request, env, ctx);
    },
};
