export const onRequestGet: PagesFunction = async (context) => {
  const { CACHE_KV } = context.env;
  try {
    const typedefJSON = await CACHE_KV.get('typedef.json', 'text');
    if (!typedefJSON) {
      return new Response('Typedef JSON not found', { status: 404 });
    }
    return new Response(typedefJSON, { headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error('Error fetching typedef JSON:', err);
    return new Response(JSON.stringify({ error: `Failed to load typedefs: ${err.message}` }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};