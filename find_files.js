import fs from 'fs';
import path from 'path';

function getFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (!['node_modules', '.git', 'dist', '.next'].includes(file)) {
        getFiles(filePath, fileList);
      }
    } else {
      fileList.push(filePath);
    }
  });
  return fileList;
}

const files = getFiles('.');
const sorted = files.map(f => ({
  path: f,
  size: fs.statSync(f).size
})).sort((a, b) => b.size - a.size);

console.log('TOP 10 LARGEST FILES:');
sorted.slice(0, 10).forEach((f, i) => {
  console.log(`${i + 1}. ${f.path} (${(f.size / 1024).toFixed(2)} KB)`);
});
