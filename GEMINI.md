## Intro

[Chunk 1 processed] ## Intro
[Chunk 1 processed] ## Intro
[Chunk 1 processed] ## Intro
[Chunk 1 processed] ## Intro
[Chunk 1 processed] ## Intro
[Chunk 1 processed] ## Intro
[Chunk 1 processed] ## Intro
[Chunk 1 processed] ## Intro
[Chunk 1 processed] ## Intro
[Chunk 1 processed] ## Intro
[Chunk 1 processed] ## Intro
[Chunk 1 processed] ## Intro
[Chunk 1 processed] ## Intro
[Chunk 1 processed] ## Intro
[Chunk 1 processed] ## Intro
[Chunk 1 processed] ## Intro
[Chunk 1 processed] ## Intro
[Chunk 1 processed] ## Intro
[Chunk 1 processed] ## Intro
[Chunk 1 processed] # hello-ai: RuneScape Asset Pipeline

This project is a custom asset creation pipeline for a new game. It provides a web-based tool to view, modify, and save RuneScape models for use in a new game project. The application is powered by a Cloudflare Worker and uses TypeScript for the backend, and HTML, CSS, and JavaScript for the frontend with Three.js for 3D rendering. Data storage is planned to use Cloudflare Workers KV.

## Project Overview

[Chunk 1 processed] ## Project Overview
[Chunk 1 processed] ## Project Overview
[Chunk 1 processed] ## Project Overview
[Chunk 1 processed] ## Project Overview
[Chunk 1 processed] ## Project Overview
[Chunk 1 processed] ## Project Overview
[Chunk 1 processed] ## Project Overview
[Chunk 1 processed] ## Project Overview
[Chunk 1 processed] ## Project Overview
[Chunk 1 processed] ## Project Overview
[Chunk 1 processed] ## Project Overview
[Chunk 1 processed] ## Project Overview
[Chunk 1 processed] ## Project Overview
[Chunk 1 processed] ## Project Overview
[Chunk 1 processed] ## Project Overview
[Chunk 1 processed] ## Project Overview
[Chunk 1 processed] ## Project Overview
[Chunk 1 processed] ## Project Overview
[Chunk 1 processed] ## Project Overview
[Chunk 1 processed] ## Project Overview

The vision for `hello-ai` is to create a web application that mimics the RuneApps model viewer. This application will fetch RuneScape models and their metadata, allow users to view and modify model colors, and then save the modified model's image and metadata for use as assets in the user's own game.

The project is structured in phases:

1.  **Deconstructing the Model Viewer**: Analyzing the `rsmv` source code to understand model downloading, decoding, and rendering.
2.  **Building the Front-End**: Creating a basic 3D viewer with Three.js and adding color-changing controls.
3.  **"Save" Functionality**: Implementing image and metadata capture, and storing this data using Cloudflare Workers KV.

The current implementation includes a minimal animation demo integrated into the Cloudflare Worker.

## Building and Running

[Chunk 1 processed] ## Building and Running
[Chunk 1 processed] ## Building and Running
[Chunk 1 processed] ## Building and Running
[Chunk 1 processed] ## Building and Running
[Chunk 1 processed] ## Building and Running
[Chunk 1 processed] ## Building and Running
[Chunk 1 processed] ## Building and Running
[Chunk 1 processed] ## Building and Running
[Chunk 1 processed] ## Building and Running
[Chunk 1 processed] ## Building and Running
[Chunk 1 processed] ## Building and Running
[Chunk 1 processed] ## Building and Running
[Chunk 1 processed] ## Building and Running
[Chunk 1 processed] ## Building and Running
[Chunk 1 processed] ## Building and Running
[Chunk 1 processed] ## Building and Running
[Chunk 1 processed] ## Building and Running
[Chunk 1 processed] ## Building and Running
[Chunk 1 processed] ## Building and Running
[Chunk 1 processed] ## Building and Running

The project uses `wrangler` for Cloudflare Worker development and deployment, and `vitest` for testing.

### Available Scripts:

- `npm run deploy`: Deploys the Cloudflare Worker to production.
- `npm run dev`: Starts a local development server for the Cloudflare Worker.
- `npm run start`: Alias for `npm run dev`.
- `npm run test`: Runs tests using Vitest.
- `npm run cf-typegen`: Generates Cloudflare Worker types.

### Cloudflare Worker Configuration:

The Cloudflare Worker is configured via `wrangler.toml`:

- `name`: `hello-ai`
- `main`: `src/index.ts` (main entry point)
- `compatibility_date`: `2025-10-11`
- `workers_dev`: `true`
- `site.bucket`: `./public` (path to static assets)
- `site.entry-point`: `./`

## Development Conventions

[Chunk 1 processed] ## Development Conventions
[Chunk 1 processed] ## Development Conventions
[Chunk 1 processed] ## Development Conventions
[Chunk 1 processed] ## Development Conventions
[Chunk 1 processed] ## Development Conventions
[Chunk 1 processed] ## Development Conventions
[Chunk 1 processed] ## Development Conventions
[Chunk 1 processed] ## Development Conventions
[Chunk 1 processed] ## Development Conventions
[Chunk 1 processed] ## Development Conventions
[Chunk 1 processed] ## Development Conventions
[Chunk 1 processed] ## Development Conventions
[Chunk 1 processed] ## Development Conventions
[Chunk 1 processed] ## Development Conventions
[Chunk 1 processed] ## Development Conventions
[Chunk 1 processed] ## Development Conventions
[Chunk 1 processed] ## Development Conventions
[Chunk 1 processed] ## Development Conventions
[Chunk 1 processed] ## Development Conventions
[Chunk 1 processed] ## Development Conventions

- **Language**: TypeScript
- **Testing**: Vitest
- **Code Formatting**: Prettier (indicated by `.prettierrc`)

## Key Files

[Chunk 1 processed] ## Key Files
[Chunk 1 processed] ## Key Files
[Chunk 1 processed] ## Key Files
[Chunk 1 processed] ## Key Files
[Chunk 1 processed] ## Key Files
[Chunk 1 processed] ## Key Files
[Chunk 1 processed] ## Key Files
[Chunk 1 processed] ## Key Files
[Chunk 1 processed] ## Key Files
[Chunk 1 processed] ## Key Files
[Chunk 1 processed] ## Key Files
[Chunk 1 processed] ## Key Files
[Chunk 1 processed] ## Key Files
[Chunk 1 processed] ## Key Files
[Chunk 1 processed] ## Key Files
[Chunk 1 processed] ## Key Files
[Chunk 1 processed] ## Key Files
[Chunk 1 processed] ## Key Files
[Chunk 1 processed] ## Key Files
[Chunk 1 processed] ## Key Files

- `src/index.ts`: The main entry point for the Cloudflare Worker. It now includes a minimal animation demo that runs a 10-step loop and logs per-frame easing values to the console.
- `src/loader.js`: Contains helper functions for animation, including `updateAnimations`, `cubicEaseInOut` (an easing function), and `createMultiPhaseEasingArray` (for generating easing arrays).
- `src/animationDemo.js`: Defines minimal mesh data, sets up walk and cinematic animations with easing curves, and orchestrates the animation loop.
- `wrangler.toml`: Configuration file for the Cloudflare Worker.
- `package.json`: Project manifest, defining scripts, dependencies, and development dependencies.
