import fs from 'fs';
import path from 'path';

const publicDir = path.resolve(process.cwd(), 'public');
const outputFile = path.resolve(process.cwd(), 'kv-bulk.json');

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function (file) {
    if (fs.statSync(path.join(dirPath, file)).isDirectory()) {
      arrayOfFiles = getAllFiles(path.join(dirPath, file), arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, file));
    }
  });

  return arrayOfFiles;
}

const allFiles = getAllFiles(publicDir);

const kvBulkData = allFiles.map(filePath => {
  const relativePath = path.relative(publicDir, filePath).replace(/\\/g, '/');
  const fileContent = fs.readFileSync(filePath);
  return {
    key: relativePath,
    value: fileContent.toString('base64'),
    base64: true
  };
});

fs.writeFileSync(outputFile, JSON.stringify(kvBulkData, null, 2));

console.log(`Successfully generated ${outputFile}`);
