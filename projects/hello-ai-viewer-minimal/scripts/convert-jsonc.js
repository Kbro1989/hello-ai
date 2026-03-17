const fs = require('fs');
const path = require('path');
const jsonc = require('jsonc-parser');

const opcodesDir = path.join(__dirname, '../src/opcodes');
const generatedOpcodesDir = path.join(__dirname, '../src/generated-opcodes');

// Ensure the generated directory exists
if (!fs.existsSync(generatedOpcodesDir)) {
    fs.mkdirSync(generatedOpcodesDir);
}

fs.readdirSync(opcodesDir).forEach(file => {
    if (file.endsWith('.jsonc')) {
        const jsoncFilePath = path.join(opcodesDir, file);
        const jsonFilePath = path.join(generatedOpcodesDir, file.replace('.jsonc', '.json'));
        const content = fs.readFileSync(jsoncFilePath, 'utf8');
        const errors = [];
        const parsed = jsonc.parse(content, errors);

        if (errors.length > 0) {
            console.error(`Error parsing ${file}:`, errors);
        } else {
            fs.writeFileSync(jsonFilePath, JSON.stringify(parsed, null, 2), 'utf8');
            console.log(`Converted ${file} to ${path.basename(jsonFilePath)} in ${path.basename(generatedOpcodesDir)}`);
        }
    }
});