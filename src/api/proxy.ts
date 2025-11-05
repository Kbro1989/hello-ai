// src/api/proxy.ts
// Cloudflare Worker route handler (TypeScript)
export async function handleProxy(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const qUrl = url.searchParams.get("url");
  const openrs2 = url.searchParams.get("openrs2"); // cache id (e.g., 0 for latest or a numeric cache build)
  const group = url.searchParams.get("group"); // optional group/file params for later
  const file = url.searchParams.get("file");

  // Build target URL
  let target: string | null = null;
  if (qUrl) {
    target = qUrl;
  } else if (openrs2) {
    // Use OpenRS2 archive API to download disk.zip for a given cache id.
    // Example: https://archive.openrs2.org/caches/runescape/<id>/disk.zip
    // openrs2 == "0" is often used by tools to mean "latest" — archive treats numeric ids
    const id = encodeURIComponent(openrs2);
    target = `https://archive.openrs2.org/caches/runescape/${id}/disk.zip`;
    // Note: This returns a zip of many cache files. We'll extract later.
  } else {
    return new Response(JSON.stringify({ error: "missing query param: url or openrs2" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  // retry helper
  async function fetchWithRetry(u: string, attempts = 3, timeoutMs = 10000): Promise<Response> {
    for (let i = 0; i < attempts; i++) {
      try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeoutMs);
        const res = await fetch(u, { signal: controller.signal });
        clearTimeout(id);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res;
      } catch (err) {
        // last attempt -> rethrow
        if (i === attempts - 1) throw err;
        // else small backoff
        await new Promise((r) => setTimeout(r, 200 * (i + 1)));
      }
    }
    throw new Error("unreachable");
  }

  try {
    const upstream = await fetchWithRetry(target, 4, 15000);
    // Clone response body stream and headers
    const headers = new Headers(upstream.headers);
    // override some headers for safety
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    headers.set("Cache-Control", "private, max-age=0"); // adjust as needed
    // Force content-type: octet-stream when binary (or preserve if present)
    if (!headers.has("content-type")) headers.set("content-type", "application/octet-stream");
    const body = upstream.body;
    return new Response(body, { status: 200, headers });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: String(err.message ?? err) }), {
      status: 502,
      headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}
