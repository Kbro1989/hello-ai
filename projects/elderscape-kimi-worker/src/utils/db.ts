// src/utils/db.ts
import { Env, KimiMessage } from '../types';

const HISTORY_LIMIT = 20; // Keep the last 20 messages (10 turns)

export async function loadChatHistory(env: Env, player_id: string, npc_id: string, region: string): Promise<KimiMessage[]> {
    const historyStmt = env.DB.prepare(
        'SELECT history FROM dialogue WHERE player_id = ?1 AND npc_id = ?2 AND region = ?3'
    );
    const previousChat = await historyStmt.bind(player_id, npc_id, region).first<{ history: string }>();
    return previousChat ? JSON.parse(previousChat.history) : [];
}

export async function saveChatHistory(env: Env, player_id: string, npc_id: string, region: string, newHistory: KimiMessage[]): Promise<void> {
    // Trim the history if it exceeds the limit
    if (newHistory.length > HISTORY_LIMIT) {
        if (env.DEBUG === "true") {
            console.log(`Trimming history from ${newHistory.length} to ${HISTORY_LIMIT} messages.`);
        }
        newHistory = newHistory.slice(newHistory.length - HISTORY_LIMIT);
    }

    const updateStmt = env.DB.prepare(
        `INSERT INTO dialogue (player_id, npc_id, region, history, last_updated)
         VALUES (?1, ?2, ?3, ?4, CURRENT_TIMESTAMP)
         ON CONFLICT(player_id, npc_id, region)
         DO UPDATE SET history = ?4, last_updated = CURRENT_TIMESTAMP`
    );
    await updateStmt.bind(player_id, npc_id, region, JSON.stringify(newHistory)).run();
}

export async function getNpcData(env: Env, npc_id: string): Promise<{ region: string, dialogue_prompt: string } | null> {
    const npcStmt = env.DB.prepare(
        'SELECT region, dialogue_prompt FROM npcs WHERE npc_id = ?1'
    );
    return await npcStmt.bind(npc_id).first();
}