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
  if (content.includes('createStaleTime') && !content.includes('from \'@/shared/freshnessSchema\'') && !content.includes('from "../shared/freshnessSchema"')) {
    const importStatement = "import { createStaleTime } from '@/shared/freshnessSchema';\n";
    content = importStatement + content;
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Added import to ${file}`);
  }
});
