-- Schema for the 'dialogue' table in the 'elderscape' D1 database

DROP TABLE IF EXISTS dialogue;
DROP TABLE IF EXISTS npcs;

CREATE TABLE dialogue (
    player_id TEXT NOT NULL,
    npc_id TEXT NOT NULL,
    region TEXT NOT NULL, -- Added region as per user suggestion
    history TEXT NOT NULL, -- Storing the chat history as a JSON string
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (player_id, npc_id, region) -- Composite primary key
);

-- This index helps optimize queries filtering by player, NPC, and region.
CREATE INDEX IF NOT EXISTS idx_dialogue_player_npc_region ON dialogue (player_id, npc_id, region);


-- NPC metadata table (optional, as per user suggestion)
CREATE TABLE npcs (
    npc_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    region TEXT NOT NULL,
    dialogue_prompt TEXT, -- Initial prompt/context for the NPC
    -- Add other NPC-specific metadata here (e.g., quest_id, faction, location)
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);