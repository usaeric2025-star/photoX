import fs from 'fs';
import path from 'path';

function getFiles(dir, allFiles = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const name = path.join(dir, file);
    if (fs.statSync(name).isDirectory()) {
      if (!name.includes('node_modules') && !name.includes('.git') && !name.includes('dist')) {
        getFiles(name, allFiles);
      }
    } else {
      const content = fs.readFileSync(name, 'utf-8');
      const lines = content.split('\n').length;
      allFiles.push({ path: name, lines: lines });
    }
  }
  return allFiles;
}

const files = getFiles('./src');
files.sort((a, b) => b.lines - a.lines);

console.log('Top 20 Files in src/ by Line Count:');
files.slice(0, 20).forEach(f => {
  console.log(`${f.lines} lines - ${f.path}`);
});
