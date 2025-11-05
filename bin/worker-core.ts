import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { refineSectionWithChunking, Chunk } from '../src/geminiHelper'; // Import Chunk
import { Reporter } from 'vitest'; // Import Reporter type from vitest

export interface RefineOptions {
	dryRun?: boolean;
	preview?: boolean;
	skip?: boolean;
	logDir?: string;
	reporter?: Reporter; // Add reporter to options
}

export async function refineSection(sectionName: string, sectionContent: string, options: RefineOptions = {}): Promise<string | null> {
	const { dryRun = false, preview = false, skip = false, logDir = './logs', reporter } = options;

	if (skip) {
		console.log(chalk.yellow(`[SKIP] Section: ${sectionName}`));
		return null;
	}

	if (preview) {
		console.log(chalk.blue(`[PREVIEW] Section: ${sectionName}`));
		console.log(sectionContent);
		const { continueRefine } = await inquirer.prompt([
			{
				type: 'confirm',
				name: 'continueRefine',
				message: 'Apply AI refinement to this section?',
				default: false,
			},
		]);
		if (!continueRefine) return null;
	}

	console.log(chalk.cyan(`[REFINE] Section: ${sectionName}`));

	let refinedContent: string;
	let chunkResults: Chunk[] = [];
	try {
		const result = await refineSectionWithChunking(sectionContent, {
			dryRun,
			preview,
			logDir,
			sectionName,
			reporter, // Pass reporter to refineSectionWithChunking
		});
		refinedContent = result.refinedContent;
		chunkResults = result.chunkResults;
	} catch (err) {
		console.error(chalk.red(`[ERROR] Section: ${sectionName}`), err);
		return null;
	}

	try {
		if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
		const logFile = path.join(logDir, `${sectionName.replace(/\s+/g, '_')}.log`);
		fs.writeFileSync(logFile, refinedContent, 'utf8');
		console.log(chalk.green(`[LOGGED] Section saved to ${logFile}`));
	} catch (err) {
		console.error(chalk.red(`[LOG ERROR] Could not write log for section ${sectionName}`), err);
	}

	// If a reporter is present, pass chunkResults to its onTestEnd method
	if (reporter && (reporter as any).onTestEnd) {
		(reporter as any).onTestEnd(
			{ name: sectionName } as any, // Mock Test object
			{ state: 'pass', duration: 0 } as any, // Mock TestResult object
			chunkResults // Pass chunkResults
		);
	}

	if (dryRun) {
		console.log(chalk.magenta(`[DRY-RUN] Section: ${sectionName} refined but not applied.`));
		return refinedContent;
	}

	return refinedContent;
}
