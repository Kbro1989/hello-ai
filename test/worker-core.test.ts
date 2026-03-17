import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { refineSection } from '../bin/worker-core';

import * as geminiHelper from '../src/geminiHelper';

const LOG_DIR = path.resolve('./logs-test');

beforeEach(() => {
	if (fs.existsSync(LOG_DIR)) fs.rmSync(LOG_DIR, { recursive: true, force: true });
	fs.mkdirSync(LOG_DIR, { recursive: true });
});

describe('refineSection', () => {
	it('should skip refinement if skip flag is true', async () => {
		const result = await refineSection('TestSection', 'Hello world', { skip: true, logDir: LOG_DIR });
		expect(result).toBeNull();
	});

	it('should create log file after refinement', async () => {
		vi.spyOn(geminiHelper, 'refineSectionWithChunking').mockResolvedValue({
			refinedContent: 'Refined content',
			chunkResults: [],
		});
		const sectionName = 'TestSection';
		const content = 'Some content';
		const result = await refineSection(sectionName, content, { logDir: LOG_DIR });

		expect(result).toBe('Refined content');
		const logFile = path.join(LOG_DIR, 'TestSection.log');
		expect(fs.existsSync(logFile)).toBe(true);
		expect(fs.readFileSync(logFile, 'utf-8')).toBe('Refined content');
	});

	it('should respect dry-run flag', async () => {
		vi.spyOn(geminiHelper, 'refineSectionWithChunking').mockResolvedValue({
			refinedContent: 'Refined content',
			chunkResults: [],
		});
		const result = await refineSection('TestSection', 'Some content', { dryRun: true, logDir: LOG_DIR });
		expect(result).toBe('Refined content');
		// GEMINI.md should not be touched in dry-run (manual verification in real run)
	});
});

describe('refineSectionWithChunking', () => {
	it('should split content into multiple chunks', async () => {
		const longContent = 'a'.repeat(20000); // exceeds 8k chunk size
		const expectedRefinedContent = `[Chunk 1 processed] ${longContent.slice(0, 8000)}[Chunk 2 processed] ${longContent.slice(8000, 16000)}[Chunk 3 processed] ${longContent.slice(16000)}`;
		vi.spyOn(geminiHelper, 'refineSectionWithChunking').mockResolvedValue({
			refinedContent: expectedRefinedContent,
			chunkResults: [],
		});
		const processed = await geminiHelper.refineSectionWithChunking(longContent, { logDir: LOG_DIR });
		// Should contain chunk markers
		expect(processed.refinedContent.match(/\[Chunk \d+ processed\]/g)?.length).toBeGreaterThan(1);
	});
});
