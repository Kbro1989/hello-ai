export type DebugData = {
  rootstate: unknown;
  opcodes: { op: string; index: number; stacksize: number; jump?: { to: number } }[];
} | null;