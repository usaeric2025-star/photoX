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
      const stats = fs.statSync(name);
      allFiles.push({ path: name, size: stats.size });
    }
  }
  return allFiles;
}

const files = getFiles('./src');
files.sort((a, b) => b.size - a.size);

console.log('Top 20 Largest Files in src/:');
files.slice(0, 20).forEach(f => {
  const sizeKB = (f.size / 1024).toFixed(2);
  console.log(`${sizeKB} KB - ${f.path}`);
});
