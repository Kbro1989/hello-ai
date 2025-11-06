import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const __dirname = path.resolve();
const cacheDir = path.join(__dirname, 'cache');

function uploadFile(key, filePath) {
    try {
        execSync(`wrangler kv:put "${key}" --path="${filePath}"`);
        console.log(`Uploaded ${filePath} to ${key}`);
    } catch (error) {
        console.error(`Failed to upload ${filePath}: ${error.message}`);
    }
}

function uploadCache() {
    const majors = fs.readdirSync(cacheDir);

    for (const major of majors) {
        const majorDir = path.join(cacheDir, major);
        if (fs.statSync(majorDir).isDirectory()) {
            if (major === 'index') {
                const files = fs.readdirSync(majorDir);
                for (const file of files) {
                    const key = `index-${file}`;
                    const filePath = path.join(majorDir, file);
                    uploadFile(key, filePath);
                }
            } else {
                const minors = fs.readdirSync(majorDir);
                for (const minor of minors) {
                    const key = `data-${major}-${minor}`;
                    const filePath = path.join(majorDir, minor);
                    uploadFile(key, filePath);
                }
            }
        }
    }
}

uploadCache();