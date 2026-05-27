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

  // Fix select.prop mappings
  content = content.replace(/\.select\.id\b/g, ".select('id')");
  content = content.replace(/\.select\.photo_id\b/g, ".select('photo_id')");
  content = content.replace(/\.select\.group_id\b/g, ".select('group_id')");
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Restored select in ${file}`);
  }
});
