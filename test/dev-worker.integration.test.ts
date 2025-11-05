import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { runDevWorker } from "../bin/dev-worker";

// Mock the reporter before importing runDevWorker
vi.mock("../test/reporter", () => {
  return {
    default: class MockReporter {
      options: any;
      testResults: any[] = []; // Add testResults array
      constructor(options: any) {
        this.options = options;
      }
      async promptChunk(chunk: any) {
        // Simulate different actions based on section name
        if (chunk.chunkId?.includes("Intro")) chunk.action = "applied";
        else if (chunk.chunkId?.includes("Section A")) chunk.action = "applied";
        else if (chunk.chunkId?.includes("Section B")) {
          chunk.action = "edited";
          chunk.content = `${chunk.content} [edited by test]`;
        } else if (chunk.chunkId?.includes("Section C")) chunk.action = "skipped";
        chunk.startTime = new Date().toISOString();
        chunk.endTime = new Date().toISOString();
        chunk.durationMs = 10;
        return chunk;
      }
      async processChunks(chunks: any[]) {
        const results = [];
        for (const c of chunks) {
          results.push(await this.promptChunk(c));
        }
        return results;
      }
      onTestEnd(test: any, result: any, chunkResults: any[]) {
        this.testResults.push({
          name: test.name,
          state: result.state,
          chunks: chunkResults,
        });
      }
      onFinished() {
        // Simulate creating a JSON summary file
        const summaryPath = path.join(this.options.logDir, "test-summary.json");
        const flags = {
          dryRun: this.options.dryRun,
          preview: this.options.preview,
          skip: this.options.skip,
        };
        fs.writeFileSync(summaryPath, JSON.stringify({ flags, tests: this.testResults }), "utf-8");
      }
    }
  };
});

// Mock inquirer to prevent interactive prompts from hanging the test
vi.mock('inquirer', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    default: {
      ...actual.default,
      prompt: vi.fn().mockResolvedValue({ continueRefine: true }),
    },
  };
});

const TEST_DIR = path.resolve("./tmp-integration");
const GEMINI_FILE = path.join(TEST_DIR, "GEMINI.md");
const LOG_DIR = path.join(TEST_DIR, "logs");

beforeEach(() => {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(LOG_DIR, { recursive: true });

  fs.writeFileSync(
    GEMINI_FILE,
    `# Intro\nThis is the intro content.\n\n## Section A\n\`\`\`js\n// chunk-1\nconsole.log("Initial content A");\n\`\`\`\n\n## Section B\n\`\`\`js\n// chunk-2\nconsole.log("Initial content B");\n\`\`\`\n\n## Section C\n\`\`\`js\n// chunk-3\nconsole.log("Initial content C");\n\`\`\`\n`,
    "utf-8"
  );
});

afterEach(() => {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("DevWorker Integration with Mocked Reporter", () => {
  it("should process chunks with simulated actions and produce JSON summary", async () => {
    await runDevWorker({
      dryRun: false,
      preview: true,
      skip: false,
      geminiFile: GEMINI_FILE,
      logDir: LOG_DIR,
      reporter: new (await import("../test/reporter")).default({
        dryRun: false,
        preview: true,
        skip: false,
        logDir: LOG_DIR,
      }),
    });

    // Read JSON summary
    const jsonFiles = fs.readdirSync(LOG_DIR).filter(f => f.endsWith(".json"));
    expect(jsonFiles.length).toBeGreaterThan(0);

    const summaryPath = path.join(LOG_DIR, jsonFiles[0]);
    const jsonSummary = JSON.parse(fs.readFileSync(summaryPath, "utf-8"));

    // Validate CLI flags
    expect(jsonSummary.flags).toEqual({
      dryRun: false,
      preview: true,
      skip: false,
    });

    // Validate tests
    expect(jsonSummary.tests).toHaveLength(4); // four sections in GEMINI_FILE

    for (const test of jsonSummary.tests) {
      expect(test.state).toBe("pass");
      expect(Array.isArray(test.chunks)).toBe(true);
      expect(test.chunks.length).toBeGreaterThan(0);

      // Ensure appropriate chunk actions are reflected
      for (const chunk of test.chunks) {
        if (test.name === "Intro") {
          expect(chunk.action).toBe("applied");
          expect(chunk.content).toContain("This is the intro content.");
        } else if (test.name === "Section A") {
          expect(chunk.action).toBe("applied");
          expect(chunk.content).toContain("Initial content A");
        } else if (test.name === "Section B") {
          expect(chunk.action).toBe("edited");
          expect(chunk.content).toContain(`## Section B\n\`\`\`js\n// chunk-2\nconsole.log("Initial content B");\n\`\`\` [edited by test]`);
        } else if (test.name === "Section C") {
          expect(chunk.action).toBe("skipped");
          expect(chunk.content).toContain("Initial content C");
        }
      }
    }
  });
});
