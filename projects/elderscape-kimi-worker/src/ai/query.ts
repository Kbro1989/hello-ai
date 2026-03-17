// src/ai/query.ts
import { Router, IRequest } from 'itty-router';
import { Env, AiQueryRequest, KimiMessage } from '../types';
import { loadChatHistory, saveChatHistory, getNpcData } from '../utils/db';

const queryRouter = Router();

queryRouter.post('/ai/query', async (req: IRequest, env: Env) => {
	try {
		const { prompt, key, player_id, npc_id, region } = await req.json<AiQueryRequest>();

		// 1. Authenticate the request
		if (!key || key !== env.KIMI_KEY) {
			return new Response('Unauthorized. Invalid key.', { status: 401 });
		}

		if (!prompt || !player_id || !npc_id || !region) {
			return new Response('Missing required fields: prompt, player_id, npc_id, region.', { status: 400 });
		}

		// 2. Validate NPC and Region
		const npcData = await getNpcData(env, npc_id);
		if (!npcData) {
			return new Response(`NPC with ID '${npc_id}' not found.`, { status: 404 });
		}
		if (npcData.region !== region) {
			return new Response(`NPC '${npc_id}' is not in the '${region}' region.`, { status: 400 });
		}

		if (env.DEBUG === "true") {
			console.log(`Query received for player '${player_id}' with NPC '${npc_id}' in region '${region}'.`);
		}

		// 3. Retrieve chat history from D1
		const history = await loadChatHistory(env, player_id, npc_id, region);

		// 4. Construct the prompt for Kimi, including history and system prompt
		const messages: KimiMessage[] = [];
		if (npcData.dialogue_prompt) {
			messages.push({ role: 'system', content: npcData.dialogue_prompt });
		}
		messages.push(...history, { role: 'user', content: prompt });

		// 5. Call the Kimi API
		const kimiResponse = await fetch('https://api.kimi.ai/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${env.KIMI_KEY}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model: 'moonshot-v1-8k',
				messages: messages,
			}),
		});

		if (!kimiResponse.ok) {
			const errorText = await kimiResponse.text();
			console.error(`Kimi API error: ${kimiResponse.status} ${errorText}`);
			return new Response(`Kimi API error: ${errorText}`, { status: kimiResponse.status });
		}

		const kimiResult = await kimiResponse.json<{ choices: { message: { content: string } }[] }>();
		const kimiReply = kimiResult.choices[0].message.content;

		// 6. Update the chat history in D1
		const newHistory: KimiMessage[] = [
			...history,
			{ role: 'user', content: prompt },
			{ role: 'assistant', content: kimiReply },
		];

		await saveChatHistory(env, player_id, npc_id, region, newHistory);

		if (env.DEBUG === "true") {
			console.log(`Reply for NPC '${npc_id}': "${kimiReply}"`);
		}

		// 7. Return the response to the client
		return new Response(JSON.stringify({ reply: kimiReply }), {
			headers: { 'Content-Type': 'application/json' },
		});

	} catch (error) {
		console.error('Error in /ai/query:', error);
		return new Response('An internal error occurred.', { status: 500 });
	}
});

export default queryRouter;