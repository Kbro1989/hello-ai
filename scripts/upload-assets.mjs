import { execSync } from 'child_process';

console.log('Generating KV bulk JSON...');
execSync('node scripts/generate-kv-bulk-json.mjs', { stdio: 'inherit' });

console.log('Uploading public assets to KV...');
execSync('npx wrangler kv bulk put kv-bulk.json --binding=ASSETS --preview false --remote', { stdio: 'inherit' });