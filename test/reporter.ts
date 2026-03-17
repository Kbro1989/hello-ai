import { Reporter, Test, TestResult } from 'vitest';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import readline from 'readline';

const LOG_DIR = path.resolve(process.cwd(), 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR);

function timestamp() {
	return new Date().toISOString();
}

export interface Chunk {
	chunkId: string;
	content: string;
	dryRun?: boolean;
	action?: 'applied' | 'skipped' | 'edited';
	startTime?: string;
	endTime?: string;
	durationMs?: number;
	error?: string;
}

interface ReporterOptions {
	dryRun: boolean;
	preview: boolean;
	skip: boolean;
	logDir: string;
	testMode?: boolean; // Add testMode flag
}

export default class InteractiveCLIReporter implements Reporter {
	private results: {
		name: string;
		state: string;
		startTime: string;
		endTime: string;
		durationMs: number;
		error?: string;
		chunks?: Chunk[];
	}[] = [];

	private logFile: string;
	private jsonFile: string;
	private options: ReporterOptions;

	constructor(options: ReporterOptions) {
		this.options = options;
		if (!fs.existsSync(options.logDir)) fs.mkdirSync(options.logDir, { recursive: true });
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		this.logFile = path.join(options.logDir, `test-${timestamp}.log`);
		this.jsonFile = path.join(options.logDir, `test-${timestamp}.json`);
	}

	/** Simulate interactive decision per chunk */
	public async promptChunk(chunk: Chunk): Promise<Chunk> {
		if (this.options.testMode) {
			// In test mode, provide deterministic answers without prompting
			if (chunk.chunkId.includes('chunk-1')) {
				chunk.action = 'applied';
				chunk.dryRun = false;
			} else if (chunk.chunkId.includes('chunk-2')) {
				chunk.action = 'edited';
				chunk.dryRun = false;
				chunk.content = chunk.content + ' [edited by test]';
			} else {
				chunk.action = 'skipped';
				chunk.dryRun = true;
			}
			chunk.startTime = new Date().toISOString();
			chunk.endTime = new Date().toISOString();
			chunk.durationMs = 100; // Simulate a short duration
			return chunk;
		}

		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		console.log(chalk.blueBright(`\n=== CHUNK: ${chunk.chunkId} ===`));
		console.log(chalk.gray(chunk.content || '<no content>'));

		const question = `Choose action: (a)pply, (s)kip, (e)dit [default: apply]: `;
		const answer: string = await new Promise((resolve) => {
			rl.question(question, (input) => resolve(input.trim().toLowerCase()));
		});

		rl.close();

		chunk.startTime = new Date().toISOString();
		chunk.endTime = new Date().toISOString();
		chunk.durationMs = Math.floor(Math.random() * 2000) + 500;

		if (answer === 's') {
			chunk.action = 'skipped';
			chunk.dryRun = true;
			chunk.error = 'User skipped chunk';
		} else if (answer === 'e') {
			chunk.action = 'edited';
			chunk.dryRun = false;
			// For simplicity in CLI: accept edited content as the same
			chunk.content = chunk.content + ' [edited]';
		} else {
			chunk.action = 'applied';
			chunk.dryRun = false;
		}

		console.log(chalk.green(`Chunk action: ${chunk.action}, dryRun: ${chunk.dryRun}`));
		return chunk;
	}

	public async processChunks(chunks: Chunk[]): Promise<Chunk[]> {
		if (!chunks) return [];
		const results: Chunk[] = [];
		for (const chunk of chunks) {
			const res = await this.promptChunk(chunk);
			results.push(res);
		}
		return results;
	}

	onTestEnd(test: Test, result: TestResult, chunks: Chunk[] = []) {
		const startTime = result.startTime ? new Date(result.startTime).toISOString() : new Date().toISOString();
		const endTime = result.endTime ? new Date(result.endTime).toISOString() : new Date().toISOString();
		const durationMs = result.duration ?? 0;

		// CLI output
		if (result.state === 'pass') console.log(chalk.green(`✔ PASS  [${endTime}] ${test.name}`));
		else if (result.state === 'fail') {
			console.log(chalk.red(`✖ FAIL  [${endTime}] ${test.name}`));
			if (result.error) console.log(chalk.red(result.error.stack || result.error.message));
		} else console.log(chalk.yellow(`⚠ SKIP  [${endTime}] ${test.name}`));

		// Append to log file
		let logEntry = `[${endTime}] ${result.state.toUpperCase()} - ${test.name}\n`;
		if (result.error) logEntry += `${result.error.stack || result.error.message}\n`;
		if (chunks.length > 0) {
			logEntry += `  Chunk Results:\n`;
			for (const chunk of chunks) {
				logEntry += `    - [${chunk.startTime}] chunkId=${chunk.chunkId} action=${chunk.action} dryRun=${chunk.dryRun}\n`;
				if (chunk.error) logEntry += `      error=${chunk.error}\n`;
			}
		}
		fs.appendFileSync(this.logFile, logEntry);

		// Save for summary
		this.results.push({
			name: test.name,
			state: result.state,
			startTime,
			endTime,
			durationMs,
			error: result.error ? result.error.stack || result.error.message : undefined,
			chunks,
		});
	}

	onFinished() {
		// CLI summary table
		const total = this.results.length;
		const passed = this.results.filter((r) => r.state === 'pass').length;
		const failed = this.results.filter((r) => r.state === 'fail').length;
		const skipped = this.results.filter((r) => r.state === 'skip').length;

		console.log(chalk.blueBright('\n=== TEST SUMMARY ==='));
		console.log(
			chalk.cyan(`Total: ${total}`),
			chalk.green(`Passed: ${passed}`),
			chalk.red(`Failed: ${failed}`),
			chalk.yellow(`Skipped: ${skipped}`)
		);

		// Append summary to log file
		const summaryText = `\n[${new Date().toISOString()}] TEST SUMMARY\nTotal: ${total}, Passed: ${passed}, Failed: ${failed}, Skipped: ${skipped}\n`;
		fs.appendFileSync(this.logFile, summaryText);
		console.log(chalk.blueBright(`Log saved to: ${this.logFile}`));

		// Write JSON summary including CLI flags
		const jsonSummary = {
			timestamp: new Date().toISOString(),
			total,
			passed,
			failed,
			skipped,
			flags: {
				dryRun: this.options.dryRun,
				preview: this.options.preview,
				skip: this.options.skip,
			},
			tests: this.results,
		};
		fs.writeFileSync(this.jsonFile, JSON.stringify(jsonSummary, null, 2));
		console.log(chalk.blueBright(`JSON summary saved to: ${this.jsonFile}\n`));
	}
}
