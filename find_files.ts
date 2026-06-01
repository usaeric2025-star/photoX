import { readdirSync, statSync } from 'fs';
import { join } from 'path';

function walk(dir: string, results: string[] = []) {
  const list = readdirSync(dir);
  list.forEach(file => {
    // skip node_modules and .git
    if (file === 'node_modules' || file === '.git' || file === 'dist') return;
    const path = join(dir, file);
    const stat = statSync(path);
    if (stat && stat.isDirectory()) {
      walk(path, results);
    } else {
      results.push(path);
    }
  });
  return results;
}

const allFiles = walk('.');
console.log('--- ALL FILES IN WORKSPACE (FILTERS FOR TOOLBAR & EMPTYSTATE) ---');
allFiles.forEach(f => {
  if (f.toLowerCase().includes('toolbar') || f.toLowerCase().includes('empty') || f.toLowerCase().includes('diag')) {
    console.log(f);
  }
});

console.log('\n--- ALL FILES IN src/pages/AdminPage ---');
try {
  console.log(readdirSync('src/pages/AdminPage'));
} catch (e: any) {
  console.log('Error reading src/pages/AdminPage:', e.message);
}
