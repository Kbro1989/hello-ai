
import esbuild from 'esbuild';
import path from 'path';
import fs from 'fs';

const __dirname = path.resolve();

const rsmvPath = path.join(__dirname, 'rsmv');
const rsmvDistPath = path.join(rsmvPath, 'dist');
const rsmvWebPath = path.join(rsmvPath, 'src', 'viewer');

const workerSrcPath = path.join(__dirname, 'src');
const workerRsmvPath = path.join(workerSrcPath, 'rsmv');
const workerRsmvWebPath = path.join(workerSrcPath, 'rsmv-web');

// Ensure directories exist
fs.mkdirSync(workerRsmvPath, { recursive: true });
fs.mkdirSync(workerRsmvWebPath, { recursive: true });

// Copy rsmv files to worker src
fs.readdirSync(rsmvPath).forEach(file => {
    const srcFile = path.join(rsmvPath, file);
    const destFile = path.join(workerRsmvPath, file);
    if (fs.statSync(srcFile).isFile()) {
        fs.copyFileSync(srcFile, destFile);
    }
});

// Copy rsmv-web files to worker src
fs.readdirSync(rsmvWebPath).forEach(file => {
    const srcFile = path.join(rsmvWebPath, file);
    const destFile = path.join(workerRsmvWebPath, file);
    if (fs.statSync(srcFile).isFile()) {
        fs.copyFileSync(srcFile, destFile);
    }
});

// Build rsmv-web for the worker
esbuild.build({
    entryPoints: [path.join(rsmvWebPath, 'threejsrender.ts')],
    bundle: true,
    outfile: path.join(workerRsmvWebPath, 'modelviewer.js'),
    format: 'esm',
    sourcemap: true,
    platform: 'node',
    external: [
        'three',
        'autobind-decorator',
        'comment-json',
        'react',
        'react-dom/client',
        'json-stringify-pretty-compact',
        'cmd-ts',
        'idb-keyval',
        'classnames',
        'json-schema',
        'zlib',
        'path',
        'fs',
        'fs/promises',
        'net',
        'node:events',
        'node:util',
        'node:os',
        'node:child_process',
        'node:crypto',
        'lzma/src/lzma_worker.js'
    ],
    loader: {
        '.jsonc': 'json',
        '.c': 'text'
    },
    plugins: [{
        name: 'jsonc-loader',
        setup(build) {
            build.onLoad({ filter: /\.jsonc$/ }, async (args) => {
                const content = await fs.promises.readFile(args.path, 'utf8');
                // Remove comments from JSONC content
                const cleanedContent = content.replace(/\/\/.*|\/\*[^]*?\*\//g, '').replace(/,(\s*[}\]])/g, '$1');
                return { contents: cleanedContent, loader: 'json' };
            });
        },
    }]
}).catch(() => process.exit(1));

console.log('RSMV build and copy complete.');
