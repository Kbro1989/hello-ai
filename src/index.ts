import index from '../public/index.html';

interface Env {
  AI: any;
}

async function fetch(request: Request, env: Env): Promise<Response> {
  if (request.method === 'POST') {
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

  return new Response(index, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}

export default {
  fetch,
};