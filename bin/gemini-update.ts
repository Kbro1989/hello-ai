#!/usr/bin/env ts-node
import fs from 'fs';
import path from 'path';
import util from 'util';
import chalk from 'chalk';
import { exec } from 'child_process';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import readline from 'readline';
import { tmpdir } from 'os';
import { spawnSync } from 'child_process';
import {
  ensureGeminiFile,
  readSection,
  updateSection,
  appendSection,
  appendLogLink,
} from '../src/geminiHelper';

const execAsync = util.promisify(exec);
const GEMINI_PATH = path.resolve('./GEMINI.md');
const LOGS_DIR = path.resolve('./logs');
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });

interface SectionTask {
  title: string;
  prompt: string;
}

interface RefineResult {
  section: string;
  success: boolean;
  logFile: string;
  skipped: boolean;
}

// --- Utility Functions ---
function chunkText(text: string, maxTokens = 5000): string[] {
  const lines = text.split('\n');
  const chunks: string[] = [];
  let current = '';
  for (const line of lines) {
    if ((current + line + '\n').length > maxTokens) {
      chunks.push(current);
      current = '';
    }
    current += line + '\n';
  }
  if (current) chunks.push(current);
  return chunks;
}

async function refineChunk(prompt: string, model = 'gemini-2.5-pro'): Promise<string> {
  const cmd = `gemini -p "${prompt.replace(/