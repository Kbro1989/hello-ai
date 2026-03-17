import { Router } from 'itty-router';
import { buildParser } from './opcode_reader.ts';
import { parseRsmv } from './rsmv_parser_core.ts';
import { modelToThree } from './modeltothree.ts';
// In a real app, you'd import this from the rsmv project
const parseModel = (buffer) => {
    // Placeholder for typedef
    const typedef = {};
    const parser = buildParser(null, "model", typedef);
    const rsmvModel = parseRsmv(buffer, parser);
    const threeModel = modelToThree(rsmvModel);
    return threeModel;
};
const router = Router();
router.get('/api/model/:id', async ({ params }) => {
    // In a real app, you'd fetch the model data from a KV store or R2
    // For now, we'll use a dummy buffer
    const modelData = new ArrayBuffer(0);
    const model = parseModel(modelData);
    return new Response(JSON.stringify(model), {
        headers: { 'Content-Type': 'application/json' },
    });
});
router.all('*', () => new Response('Not Found.', { status: 404 }));
export default {
    async fetch(request, env, ctx) {
        return router.handle(request, env, ctx);
    },
};
