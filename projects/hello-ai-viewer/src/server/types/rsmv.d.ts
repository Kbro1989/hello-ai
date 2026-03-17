// src/types/rsmv.d.ts
export interface OpcodeEntry {
  op: string;
  index: number;
  stacksize: number;
  jump?: { to: number };
}

export interface DebugData {
  rootstate: unknown | null; // replace `unknown` with the actual state type if you have it
  opcodes: OpcodeEntry[];
}
