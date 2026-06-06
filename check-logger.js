import fs from 'fs';
import path from 'path';

function getFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const name = path.join(dir, file);
    if (fs.statSync(name).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        getFiles(name, fileList);
      }
    } else if (name.endsWith('.ts') || name.endsWith('.tsx')) {
      fileList.push(name);
    }
  }
  return fileList;
}

const files = getFiles('./src');
let issues = 0;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('logger')) {
    // Check if the file imports logger
    const hasImport = content.includes('import') && (
      content.includes('logger') && (content.includes('from') || content.includes('import'))
    );
    if (!hasImport && !content.includes('class Logger') && !file.includes('logger.ts')) {
      console.log(`⚠️ File: ${file} contains "logger" but does NOT seem to import it!`);
      // Let's print the line containing "logger"
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (line.includes('logger')) {
          console.log(`  Line ${index + 1}: ${line.trim()}`);
        }
      });
      issues++;
    }
  }
}

console.log(`Checked ${files.length} files. Found ${issues} potential unimported logger issues.`);
