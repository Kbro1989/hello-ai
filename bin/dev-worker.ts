#!/usr/bin/env node
import fs from "fs";
import path from "path";
import chokidar from "chokidar";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { refineSection } from "./worker-core";
import { Reporter } from "vitest"; // Import Reporter type from vitest
import InteractiveCLIReporter from "../test/reporter"; // Import the interactive reporter
// import { chunkContent } from "../src/geminiHelper"; // chunkContent is not directly used here

const GEMINI_FILE = path.resolve("./GEMINI.md");
const LOG_DIR = path.resolve("./logs");

export interface DevWorkerOptions {
  dryRun: boolean;
  preview: boolean;
  skip: boolean;
  geminiFile: string;
  logDir: string;
  reporter?: Reporter; // Add reporter to options
}

// CLI options
const argv = yargs(hideBin(process.argv))
  .option("dry-run", { type: "boolean", default: false })
  .option("preview", { type: "boolean", default: false })
  .option("skip", { type: "boolean", default: false })
  .option("file", { type: "string", default: GEMINI_FILE, alias: "f" })
  .help()
  .argv;

// Reads GEMINI.md and splits sections by heading
function parseSections(filePath: string): Record<string, string> {
  const content = fs.readFileSync(filePath, "utf8");
  const sections: Record<string, string> = {};
  const regex = /(^##\s.+$)/gm;
  let match: RegExpExecArray | null;
  let lastIndex = 0;
  let lastHeader = "Intro";

  while ((match = regex.exec(content))) {
    const header = match[1].trim().replace(/^##\s*/, "");
    sections[lastHeader] = content.slice(lastIndex, match.index).trim();
    lastIndex = match.index;
    lastHeader = header;
  }

  sections[lastHeader] = content.slice(lastIndex).trim();
  return sections;
}

// Applies refinement to all sections
export async function runDevWorker(options: DevWorkerOptions) {
  const { dryRun, preview, skip, geminiFile, logDir } = options;
  const currentReporter = options.reporter || new InteractiveCLIReporter({ dryRun, preview, skip, logDir });

  const sections = parseSections(geminiFile);
  const updatedSections: Record<string, string> = {};

  for (const [name, content] of Object.entries(sections)) {
    const refined = await refineSection(name, content, {
      dryRun,
      preview,
      skip,
      logDir,
      reporter: currentReporter, // Pass reporter to refineSection
    });
    updatedSections[name] = refined || content;
  }

  if (!dryRun) {
    fs.writeFileSync(geminiFile, Object.entries(updatedSections)
      .map(([header, body]) => `## ${header}\n${body}`)
      .join("\n\n"), "utf8");
    console.log("✅ GEMINI.md updated successfully!");
  }

  // Call onFinished for the reporter to generate summary
  (currentReporter as InteractiveCLIReporter).onFinished();
}

// Watcher
chokidar.watch(["src/**/*.ts", "src/**/*.js", GEMINI_FILE]).on("change", async (filePath) => {
  console.log(`🔄 Detected change: ${filePath}`);
  await runDevWorker({
    dryRun: argv.dryRun,
    preview: argv.preview,
    skip: argv.skip,
    geminiFile: argv.file,
    logDir: LOG_DIR,
  });
});

// Initial run
runDevWorker({
  dryRun: argv.dryRun,
  preview: argv.preview,
  skip: argv.skip,
  geminiFile: argv.file,
  logDir: LOG_DIR,
});