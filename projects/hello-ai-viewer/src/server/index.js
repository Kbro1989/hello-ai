// C:\Windows\System32\Pick-Of-Gods\4.5claudecode\hello-ai\projects\hello-ai-worker-rsmv\src\index.ts
import { start } from './rsmv/viewer/index';
import { CallbackCacheLoader } from './rsmv/cache';
// URL of our deployed Cloudflare Worker proxy
const WORKER_URL = "https://rsmv-cache-worker.kristain33rs.workers.dev";
// Implement the CacheFileGetter function
const cacheFileGetter = async (major, minor, crc) => {
    const response = await fetch(`${WORKER_URL}/cache/2/${major}/${minor}`); // Using default cache ID 2
    if (!response.ok) {
        throw new Error(`Failed to fetch cache file ${major}.${minor}: ${response.statusText}`);
    }
    // Cloudflare Workers' fetch returns ArrayBuffer, rsmv expects Buffer
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
};
// Instantiate CallbackCacheLoader
const cacheSource = new CallbackCacheLoader(cacheFileGetter, false); // 'false' for needsCrc, as our proxy doesn't use it directly
// Override globalThis.source with our new cacheSource
// This is a bit of a hack, but rsmv's index.tsx expects globalThis.source to be set
globalThis.source = cacheSource;
// Start the rsmv viewer
document.addEventListener('DOMContentLoaded', () => {
    const appElement = document.getElementById('app');
    if (appElement) {
        start(appElement);
    }
    else {
        console.error("Element with ID 'app' not found.");
    }
});
