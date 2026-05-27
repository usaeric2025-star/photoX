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
  if (content.includes('staleTime:')) {
    let replaced = false;
    let newContent = content.replace(/staleTime:\s*([^\,}]+)/g, (match, p1) => {
      // Don't replace if it's already using createStaleTime, or if it's a variable or Infinity
      if (p1.includes('createStaleTime') || p1 === 'Infinity' || !/[\d\*\s]+/.test(p1)) return match;
      replaced = true;
      let policy = 'STABLE';
      if (file.toLowerCase().includes('photo') && !file.toLowerCase().includes('count')) policy = 'REALTIME';
      if (file.toLowerCase().includes('setting')) policy = 'ARCHIVE';
      return `staleTime: createStaleTime('${policy}')`;
    });

    if (replaced && !newContent.includes('createStaleTime')) {
      newContent = `import { createStaleTime } from '@/shared/freshnessSchema';\n` + newContent;
    }
    
    if (replaced) {
      console.log(`Updated ${file}`);
      fs.writeFileSync(file, newContent, 'utf8');
    }
  }
});
