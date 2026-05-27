import fs from 'fs';
import path from 'path';

function walk(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      results.push(filePath);
    }
  }
  return results;
}

const files = walk('./src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Revert t('key') back to t.key indiscriminately
  content = content.replace(/\bt\('([a-zA-Z0-9_]+)'\)/g, "t.$1");
  
  // Revert t('key', args) back to t.key(args)
  content = content.replace(/\bt\('([a-zA-Z0-9_]+)'\s*,\s*([^)]+)\)/g, "t.$1($2)");

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Reverted t('prop') completely in ${file}`);
  }
});
