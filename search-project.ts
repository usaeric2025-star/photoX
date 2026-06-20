import * as fs from 'fs';
import * as path from 'path';

function findProjectFiles(dir: string, depth = 0) {
  if (depth > 3) return;
  try {
    const files = fs.readdirSync(dir);
    console.log(`${' '.repeat(depth * 2)}[${dir}]:`, files);
    for (const file of files) {
      if (file === 'node_modules' || file === '.git') continue;
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
         findProjectFiles(fullPath, depth + 1);
      }
    }
  } catch (err: any) {
    // console.log('Error reading', dir, err.message);
  }
}

console.log('--- SCANNING FROM ROOT ---');
findProjectFiles('/');
