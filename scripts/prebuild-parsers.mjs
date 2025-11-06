import fs from 'fs';
import path from 'path';
import { buildParser } from '../tmp_prebuild/opcode_reader.js'; // Correct path
import { FileParser } from '../tmp_prebuild/opdecoder.js'; // Correct path
import models from '../rsmv/generated/models.js'; // Correct path
import typedef from '../rsmv/generated/typedef.js'; // Correct path

const projectRoot = process.cwd();
const publicDir = path.join(projectRoot, 'public');

async function prebuildParsers() {
    console.log('Pre-building models parser data...');

    // Ensure public directory exists
    if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir);
    }

    // Serialize models and typedef directly
    const serializedModels = JSON.stringify(models);
    const modelsOutputPath = path.join(publicDir, 'models.json');
    fs.writeFileSync(modelsOutputPath, serializedModels);
    console.log(`Serialized models data saved to ${path.relative(projectRoot, modelsOutputPath)}`);

    const serializedTypedef = JSON.stringify(typedef);
    const typedefOutputPath = path.join(publicDir, 'typedef.json');
    fs.writeFileSync(typedefOutputPath, serializedTypedef);
    console.log(`Serialized typedef data saved to ${path.relative(projectRoot, typedefOutputPath)}`);

    // We don't need to run buildParser here, as we are just serializing the input data.
    // The Worker will run FileParser.init with this data.
}

prebuildParsers();