import * as fs from 'fs';
import * as path from 'path';

const srcDir = path.join(process.cwd(), 'src');
const hookUses: Record<string, { definition: string; count: number; usages: string[] }> = {};

function walkDir(dir: string, callback: (filePath: string) => void) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath, callback);
    } else if (stat.isFile() && (filePath.endsWith('.ts') || filePath.endsWith('.tsx'))) {
      callback(filePath);
    }
  }
}

const files: string[] = [];
walkDir(srcDir, (f) => files.push(f));

// 1. Find all custom hooks defined in src/hooks or other folders
const hookRegex = /export\s+(?:const|function)\s+(use[A-Z][a-zA-Z0-9]*)/g;

files.forEach((file) => {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = hookRegex.exec(content)) !== null) {
    const hookName = match[1];
    // Check if it's already recorded, if not, record its definition
    if (!hookUses[hookName]) {
      hookUses[hookName] = {
        definition: path.relative(process.cwd(), file),
        count: 0,
        usages: []
      };
    }
  }
});

// 2. Count usages in all ts/tsx files
files.forEach((file) => {
  const content = fs.readFileSync(file, 'utf8');
  const relativePath = path.relative(process.cwd(), file);
  
  Object.keys(hookUses).forEach((hookName) => {
    const definitionFile = hookUses[hookName].definition;
    
    // Ignore self-usages in the definition file itself
    if (relativePath === definitionFile) {
      return;
    }
    
    // Match exact word
    const regex = new RegExp(`\\b${hookName}\\b`, 'g');
    const matches = content.match(regex);
    if (matches) {
      hookUses[hookName].count += matches.length;
      hookUses[hookName].usages.push(relativePath);
    }
  });
});

console.log('--- CUSTOM HOOK USAGES REPORT ---');
Object.entries(hookUses)
  .sort((a, b) => a[1].count - b[1].count)
  .forEach(([hookName, info]) => {
    console.log(`Hook: ${hookName}`);
    console.log(`  Defined in: ${info.definition}`);
    console.log(`  Usage Count: ${info.count}`);
    if (info.count > 0) {
      console.log(`  Used in: ${info.usages.slice(0, 5).join(', ')}${info.usages.length > 5 ? '...' : ''}`);
    } else {
      console.log('  ⚠️ UNUSED HOOK!');
    }
    console.log('');
  });
