import fs from 'fs';
import path from 'path';

function removeCallback(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf8');

  content = content.replace(/React\.useCallback\(async \(([\s\S]*?)\) => \{([\s\S]*?)\}, \[.*?\]\);/g, 'async ($1) => {$2};');
  content = content.replace(/React\.useCallback\(\(([\s\S]*?)\) => \{([\s\S]*?)\}, \[.*?\]\);/g, '($1) => {$2};');
  content = content.replace(/React\.useCallback\(\(([\s\S]*?)\) => (.*?), \[.*?\]\);/g, '($1) => $2;');

  content = content.replace(/useCallback\(async \(([\s\S]*?)\) => \{([\s\S]*?)\}, \[.*?\]\);/g, 'async ($1) => {$2};');
  content = content.replace(/useCallback\(\(([\s\S]*?)\) => \{([\s\S]*?)\}, \[.*?\]\);/g, '($1) => {$2};');
  content = content.replace(/useCallback\(\(([\s\S]*?)\) => (.*?), \[.*?\]\);/g, '($1) => $2;');

  content = content.replace(/useCallback\(\n?\s*async \(([\s\S]*?)\) => \{([\s\S]*?)\},\n?\s*\[.*?\]\n?\s*\);/gm, 'async ($1) => {$2};');
  content = content.replace(/useCallback\(\n?\s*\(([\s\S]*?)\) => \{([\s\S]*?)\},\n?\s*\[.*?\]\n?\s*\);/gm, '($1) => {$2};');

  fs.writeFileSync(filePath, content, 'utf8');
}

const findFiles = (dir: string): string[] => {
  let files: string[] = [];
  fs.readdirSync(dir, { withFileTypes: true }).forEach(dirent => {
    const fullPath = path.join(dir, dirent.name);
    if (dirent.isDirectory()) files = files.concat(findFiles(fullPath));
    else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) files.push(fullPath);
  });
  return files;
};

const files = [...findFiles('src/hooks'), ...findFiles('src/components')];
for (const f of files) {
  try {
     const orig = fs.readFileSync(f, 'utf8');
     removeCallback(f);
     const changed = fs.readFileSync(f, 'utf8');
     if (orig !== changed) console.log(`Optimized ${f}`);
  } catch (e) {}
}
