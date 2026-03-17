import { defineConfig } from 'vitest/config';
// import InteractiveCLIReporter from "./test/reporter"; // Temporarily remove
import path from 'path';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		include: ['test/**/*.test.ts'],
		coverage: {
			reporter: ['text', 'lcov'],
			reportsDirectory: './coverage',
		},
		// reporters: [new InteractiveCLIReporter({
		//   dryRun: false,
		//   preview: false,
		//   skip: false,
		//   logDir: path.resolve("./logs"),
		// })] // Temporarily remove
	},
});
