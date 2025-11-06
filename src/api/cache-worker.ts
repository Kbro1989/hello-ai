
import { IRequest, Router, error, json, withContent, withParams } from 'itty-router';

export interface Env {
    CACHE_KV: KVNamespace;
}

const router = Router();

router
    .get('/data/:major/:minor', withParams, async (request: IRequest, env: Env) => {
        const { major, minor } = request.params;
        const key = `data-${major}-${minor}`;
        const data = await env.CACHE_KV.get(key, { type: "arrayBuffer" });

        if (!data) {
            return error(404, "Data not found");
        }

        return new Response(data, { headers: { 'Content-Type': 'application/octet-stream' } });
    })
    .get('/index/:major', withParams, async (request: IRequest, env: Env) => {
        const { major } = request.params;
        const key = `index-${major}`;
        const data = await env.CACHE_KV.get(key, { type: "json" });

        if (!data) {
            return error(404, "Index not found");
        }

        return json(data);
    })
    .all('*', () => error(404, "Not Found"));

export default {
    async fetch(request: IRequest, env: Env, ctx: ExecutionContext): Promise<Response> {
        return router.handle(request, env, ctx);
    },
};
