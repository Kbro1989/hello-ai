# hello-ai — RS3 OB3 Model Server

> Cloudflare Workers · TypeScript · RSMV · KV

Cloudflare Worker that **serves parsed RS3 `.ob3` model binaries** from KV storage.
Embeds the RSMV `opdecoder` directly for edge-side cache format parsing.

## Endpoints

| Route | Method | Description |
|---|---|---|
| `/api/typedef` | GET | RS3 type definition JSON from KV |
| `/api/models` | GET | Model list JSON from KV |
| `/api/model/:id` | GET | Parse + serve OB3 binary as JSON |
| `/api/ai/suggest-materials` | POST | AI material suggestion via Workers AI |

## OB3 Parsing

- Loads raw `.ob3` binary from `ASSETS` KV by key `model_ob3:<id>`
- Parses via embedded `rsmv/opdecoder.ts` (RS3 cache opcode decoder)
- Fallback: `parseSyntheticOb3()` for test model ID `123`

## Architecture

```
src/
├── index.ts          # Worker entry
├── rsmv/opdecoder.ts # RS3 cache format decoder
├── rsmv-web/         # Web-compatible RSMV layer
├── utils/modelParser.ts
├── model-viewer.ts
├── modelStorage.ts
├── geminiHelper.ts
├── scene/
├── ai/  api/  components/  routes/  services/  types/
```

```bash
wrangler deploy
```
