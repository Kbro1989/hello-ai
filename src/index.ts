interface Env {
  AI: any;
  ASSETS: any;
}

async function fetch(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === 'POST' && url.pathname === '/') {
    let user_prompt;
    try {
      const body = await request.json();
      user_prompt = body.prompt;
      if (!user_prompt) {
        return new Response('Missing "prompt" in request body', { status: 400 });
      }
    } catch (e) {
      return new Response('Invalid JSON in request body', { status: 400 });
    }

    const response = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      prompt: user_prompt,
    });

    return new Response(JSON.stringify(response));
  }

  if (request.method === 'GET' && url.pathname === '/') {
    return env.ASSETS.fetch(new Request(url.origin + '/index.html', request));
  }

  return new Response('Not found', { status: 404 });
}

export default {
  fetch,
};