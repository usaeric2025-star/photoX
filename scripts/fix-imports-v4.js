import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const files = execSync('find api src -name "*.ts" -o -name "*.tsx"', { encoding: 'utf-8' }).split('\n').filter(Boolean);

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  let changed = false;

  // 1. Remove .js.js and replace with .js
  content = content.replace(/\.js\.js/g, '.js');
  
  // 2. Normalize imports to .js
  // Regex to match: import ... from '#src/foo/bar'
  // and ensure it becomes '#src/foo/bar.js'
  // But be careful not to create .js.js
  
  content = content.replace(/from '(#src\/[^']*)'/g, (match, p1) => {
    let pathStr = p1;
    if (pathStr.endsWith('.js')) return match;
    
    // Check if directory exists
    const fullPath = path.join(process.cwd(), pathStr.replace('#src', 'src'));
    if (fs.existsSync(fullPath) && fs.lstatSync(fullPath).isDirectory()) {
       return `from '${pathStr}/index.js'`;
    }
    return `from '${pathStr}.js'`;
  });

  content = content.replace(/from '(#lib\/[^']*)'/g, (match, p1) => {
    let pathStr = p1;
    if (pathStr.endsWith('.js')) return match;
    
    const fullPath = path.join(process.cwd(), pathStr.replace('#lib', 'src/lib'));
    if (fs.existsSync(fullPath) && fs.lstatSync(fullPath).isDirectory()) {
       return `from '${pathStr}/index.js'`;
    }
    return `from '${pathStr}.js'`;
  });
  
  // Clean up any potential double extensions if they were created before
  content = content.replace(/\.js\.js/g, '.js');

  if (fs.readFileSync(file, 'utf-8') !== content) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
}
