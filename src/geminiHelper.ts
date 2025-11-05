import fs from "fs";
import path from "path";
import { Reporter } from "vitest"; // Import Reporter type from vitest

const GEMINI_PATH = path.resolve('./GEMINI.md');

/**
 * Ensure GEMINI.md exists
 */
export function ensureGeminiFile(): void {
  if (!fs.existsSync(GEMINI_PATH)) {
    fs.writeFileSync(GEMINI_PATH, '# GEMINI.md\n\n', 'utf8');
    console.log('Created new GEMINI.md file.');
  }
}

/**
 * Append a small section to GEMINI.md
 */
export function appendSection(sectionTitle: string, content: string): void {
  ensureGeminiFile();
  const formatted = `## ${sectionTitle}\n\n${content}\n\n`;
  fs.appendFileSync(GEMINI_PATH, formatted, 'utf8');
  console.log(`Appended section: ${sectionTitle}`);
}

/**
 * Update an existing section or append if it doesn't exist
 */
export function updateSection(sectionTitle: string, newContent: string): void {
  ensureGeminiFile();
  const data = fs.readFileSync(GEMINI_PATH, 'utf8');
  const regex = new RegExp(`## ${sectionTitle}[\s\S]*?(?=\n## |$)`, 'm');
  const replacement = `## ${sectionTitle}\n\n${newContent}\n`;
  if (regex.test(data)) {
    fs.writeFileSync(GEMINI_PATH, data.replace(regex, replacement), 'utf8');
    console.log(`Updated section: ${sectionTitle}`);
  } else {
    fs.appendFileSync(GEMINI_PATH, replacement, 'utf8');
    console.log(`Section not found, appended new section: ${sectionTitle}`);
  }
}

/**
 * Read a specific section from GEMINI.md
 */
export function readSection(sectionTitle: string): string {
  ensureGeminiFile();
  const data = fs.readFileSync(GEMINI_PATH, 'utf8');
  const regex = new RegExp(`## ${sectionTitle}[\s\S]*?(?=\n## |$)`, 'm');
  const match = data.match(regex);
  return match ? match[0].replace(/^## .*?\n\n/, '') : '';
}

// Types for chunk-level simulation results
export interface Chunk {
  chunkId: string;
  content: string;
  dryRun?: boolean;
  action?: "applied" | "skipped" | "edited";
  startTime?: string;
  endTime?: string;
  durationMs?: number;
  error?: string;
}

export interface ChunkOptions {
  dryRun?: boolean;
  preview?: boolean;
  logDir?: string;
  sectionName?: string;
  reporter?: Reporter; // Add reporter to options
}

export function chunkContent(sectionName: string, content: string): Chunk[] {
  const chunks: Chunk[] = [];
  const chunkSize = 8000; // adjust per free-tier token limits
  for (let i = 0; i < content.length; i += chunkSize) {
    chunks.push({
      chunkId: `${sectionName}-chunk-${Math.floor(i / chunkSize) + 1}`,
      content: content.slice(i, i + chunkSize),
    });
  }
  return chunks;
}

export async function refineSectionWithChunking(
  content: string,
  options: ChunkOptions = {}
): Promise<{ refinedContent: string; chunkResults: Chunk[] }> {
  const { dryRun = false, reporter } = options;

  const initialChunks = chunkContent(options.sectionName || "unknown", content);

  let refined = "";
  const chunkResults: Chunk[] = [];

  for (const [index, initialChunk] of initialChunks.entries()) {
    let currentChunkResult: Chunk = {
      ...initialChunk,
      dryRun: dryRun,
      action: "applied", // Default action
    };

    if (reporter && (reporter as any).promptChunk) {
      // If reporter has promptChunk method, use it for interactive decision
      currentChunkResult = await (reporter as any).promptChunk(currentChunkResult);
    } else {
      // Default processing if no interactive reporter
      currentChunkResult.action = "applied";
      currentChunkResult.dryRun = dryRun;
    }

    // Simulate AI processing based on action
    // Always add the processed marker if the chunk is applied or edited
    if (currentChunkResult.action === "applied" || currentChunkResult.action === "edited") {
      refined += `[Chunk ${index + 1} processed] ${currentChunkResult.content}`;
    } else if (currentChunkResult.action === "skipped") {
      // If skipped, original content might be retained or nothing added
      refined += currentChunkResult.content; // Retain original content for skipped chunks
    }
    chunkResults.push(currentChunkResult);
  }

  return { refinedContent: refined, chunkResults };
}
