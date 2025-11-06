import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import commentJson from 'comment-json';

const projectRoot = process.cwd();
// Corrected the path to opcodesDir to match the observed structure: projectRoot/rsmv/src/opcodes
const opcodesDir = path.join(projectRoot, 'rsmv', 'src', 'opcodes');
// Corrected the generatedDir path to be relative to projectRoot/rsmv/
const generatedDir = path.join(projectRoot, 'rsmv', 'generated');

// Ensure the generated directory exists
if (!fs.existsSync(generatedDir)) {
    fs.mkdirSync(generatedDir, { recursive: true });
}

// Function to read and parse JSON/JSONC files
function processJsonFile(filePath, isJsonC) {
    const fullPath = path.join(opcodesDir, filePath);
    // Adjust output path to be relative to project root, under rsmv/generated
    const jsFileName = `${path.basename(filePath, path.extname(filePath))}.js`;
    const jsFilePath = path.join(generatedDir, jsFileName);

    try {
        const fileContent = fs.readFileSync(fullPath, 'utf-8');
        const jsonData = isJsonC ? commentJson.parse(fileContent) : JSON.parse(fileContent);
        const jsContent = `export default ${JSON.stringify(jsonData, null, 2)};\n`;
        fs.writeFileSync(jsFilePath, jsContent);
        // Log the path relative to the project root for clarity
        console.log(`Processed ${filePath} -> ${path.relative(projectRoot, jsFilePath)}`);
    } catch (error) {
        console.error(`Error processing ${filePath} at ${fullPath}:`, error);
        throw error; // Rethrow to stop the build on error
    }
}

// List of JSON/JSONC files to process
const jsonFiles = [
    { name: 'typedef.jsonc', isJsonC: true },
    { name: 'cacheindex.json', isJsonC: false },
    { name: 'npcs.jsonc', isJsonC: true },
    { name: 'items.jsonc', isJsonC: true },
    { name: 'objects.jsonc', isJsonC: true },
    { name: 'mapsquare_tiles.jsonc', isJsonC: true },
    { name: 'mapsquare_tiles_nxt.jsonc', isJsonC: true },
    { name: 'mapsquare_watertiles.json', isJsonC: false },
    // Corrected filename from .json to .jsonc
    { name: 'mapsquare_overlays.jsonc', isJsonC: true },
    { name: 'mapsquare_locations.json', isJsonC: false },
    { name: 'mapsquare_envs.jsonc', isJsonC: true },
    { name: 'mapzones.json', isJsonC: false },
    { name: 'enums.json', isJsonC: false },
    { name: 'mapscenes.json', isJsonC: false },
    { name: 'sequences.json', isJsonC: false },
    { name: 'framemaps.jsonc', isJsonC: true },
    { name: 'frames.json', isJsonC: false },
    { name: 'animgroupconfigs.jsonc', isJsonC: true },
    { name: 'models.jsonc', isJsonC: true },
    { name: 'oldmodels.jsonc', isJsonC: true },
    { name: 'classicmodels.jsonc', isJsonC: true },
    { name: 'spotanims.json', isJsonC: false },
    { name: 'rootcacheindex.jsonc', isJsonC: true },
    { name: 'skeletalanim.jsonc', isJsonC: true },
    { name: 'materials.jsonc', isJsonC: true },
    { name: 'oldmaterials.jsonc', isJsonC: true },
    { name: 'quickchatcategories.jsonc', isJsonC: true },
    { name: 'quickchatlines.jsonc', isJsonC: true },
    { name: 'environments.jsonc', isJsonC: true },
    { name: 'avatars.jsonc', isJsonC: true },
    { name: 'avataroverrides.jsonc', isJsonC: true },
    { name: 'identitykit.jsonc', isJsonC: true },
    { name: 'structs.jsonc', isJsonC: true },
    { name: 'params.jsonc', isJsonC: true },
    { name: 'particles_0.jsonc', isJsonC: true },
    { name: 'particles_1.jsonc', isJsonC: true },
    { name: 'audio.jsonc', isJsonC: true },
    { name: 'proctexture.jsonc', isJsonC: true },
    { name: 'oldproctexture.jsonc', isJsonC: true },
    { name: 'maplabels.jsonc', isJsonC: true },
    { name: 'cutscenes.jsonc', isJsonC: true },
    { name: 'clientscript.jsonc', isJsonC: true },
    { name: 'clientscriptdata.jsonc', isJsonC: true },
    { name: 'interfaces.jsonc', isJsonC: true },
    { name: 'dbtables.jsonc', isJsonC: true },
    { name: 'dbrows.jsonc', isJsonC: true },
];

console.log('Processing JSON/JSONC files...');
jsonFiles.forEach(({ name, isJsonC }) => {
    processJsonFile(name, isJsonC);
});

// Compile prebuild dependencies
const tempPrebuildDir = path.join(projectRoot, 'tmp_prebuild');
if (!fs.existsSync(tempPrebuildDir)) {
    fs.mkdirSync(tempPrebuildDir);
}
execSync(`npx esbuild src/rsmv/opcode_reader.ts src/rsmv/opdecoder.ts --bundle --outdir=${tempPrebuildDir} --format=esm --external:@cloudflare/workers-types`, { stdio: 'inherit' });

// Execute prebuild script
console.log('\nRunning prebuild script...');
execSync('node scripts/prebuild-parsers.mjs', { stdio: 'inherit' });

// Clean up temporary prebuild directory
// fs.rmSync(tempPrebuildDir, { recursive: true, force: true });

console.log('\nBuilding worker with esbuild...');
// Ensure the output directory exists
const distDir = path.join(projectRoot, 'dist');
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir);
}
// esbuild command remains the same, it will pick up the generated JS files
execSync('npx esbuild src/index.ts --bundle --outfile=dist/index.js --format=esm --external:@cloudflare/workers-types', { stdio: 'inherit' });

console.log('\nUploading public assets to KV...');
// Ensure the public directory exists before trying to upload assets
const publicDir = path.join(projectRoot, 'public');
if (fs.existsSync(publicDir)) {
    execSync('node scripts/upload-assets.mjs', { stdio: 'inherit' });
} else {
    console.warn('Public directory not found. Skipping asset upload.');
}
