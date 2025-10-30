
     interface Env {
       AI: any;
     }
    
     async function fetch(request: Request, env: Env): Promise<Response> {
       const response = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
         prompt: "What is the origin of the phrase Hello, World",
       });
    
      return new Response(JSON.stringify(response));
    }
   
    export default {
      fetch,
    };