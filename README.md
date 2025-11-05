# Hello-AI Development Workflow

This project provides a **fully automated development workflow** for GEMINI.md using Node.js and Cloudflare Workers (free tier).

---

## Features

- Hot reload on `src/` files and `GEMINI.md`
- Chunked AI refinement of oversized sections
- Interactive per-section editing
- CLI flags: `--dry-run`, `--preview`, `--skip`
- Logs each section in `logs/`
- Cross-platform Node.js support
- npm binary for convenience: `dev-worker`

---

## Installation

```bash
git clone <repo>
cd hello-ai
npm install
```

For TypeScript execution:

```bash
npx ts-node ./bin/dev-worker.ts
```

Or install as npm binary:

```bash
npm link
dev-worker --preview
```

---

## CLI Usage

```bash
dev-worker [options]
```

### Options

* `--dry-run`: Refine sections without applying to GEMINI.md
* `--preview`: Preview each section and confirm before refinement
* `--skip`: Skip a section entirely
* `-h, --help`: Show help

---

## GEMINI.md Workflow

1. Sections in GEMINI.md are detected by headings (`## Section Name`).
2. Each section is automatically split into chunks if it exceeds token limits.
3. Chunks are processed via `refineSectionWithChunking` (AI processing).
4. Logs are saved in `logs/` per section for auditing.

---

## Development

Watch mode is automatic via chokidar:

```bash
dev-worker
```

Changes to `src/` files or `GEMINI.md` trigger refinement automatically.

---

## Testing

Run unit tests with Vitest:

```bash
npm run test
```

Tests cover:

* CLI flag handling
* Chunked processing
* Logging behavior

---

## Notes

* Free-tier Cloudflare AI bindings are used; no paid features required.
* Ensure `NODE_TLS_REJECT_UNAUTHORIZED=0` in Windows to bypass local TLS issues if needed.
* Logs and session history are stored in `logs/`.

---

## License

MIT