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

  // fix test('ts') to test.ts
  content = content.replace(/\.test\('ts'\)/g, ".test.ts");
  content = content.replace(/\.tes\('ts'\)/g, ".test.ts");
  content = content.replace(/\.tes\+*t\('ts'\)/g, ".test.ts");

  // some files had import('./diagnostics/emptyData.test('ts')');
  // let's just fix anything matching .tes t('ts') or test('ts') in imports
  // Actually, wait, let's just find test('ts') and replace with test.ts
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Fixed test in ${file}`);
  }
});
