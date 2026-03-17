// src/types.ts

export interface Env {
	DB: D1Database;
	KIMI_KEY: string;
	KIMI_ENDPOINT: string; // For the transcription endpoint, if different from chat completions base URL
}

export interface AiQueryRequest {
	prompt: string;
	key: string;
	player_id: string;
	npc_id: string;
	region: string; // Added region as per user suggestion
}

export interface KimiMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}
