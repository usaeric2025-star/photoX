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

  // Fix Reac+t('something') -> React.something
  const originalContent = content;
  
  // This looks for any alphanumeric character followed by t('something')
  content = content.replace(/([a-zA-Z0-9_])t\('([a-zA-Z0-9_]+)'\)/g, "$1t.$2");
  
  // What about dataset('key')? -> dataset.key
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Fixed regex mess in ${file}`);
  }
});
