import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const files = execSync('find api src -name "*.ts" -o -name "*.tsx"', { encoding: 'utf-8' }).split('\n').filter(Boolean);

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  let changed = false;

  // Fix double .js.js extension introduced by previous script
  content = content.replace(/\.js\.js/g, '.js');
  
  // Fix imports like ./foo.js.js to ./foo.js
  content = content.replace(/\.ts\.js/g, '.js');
  content = content.replace(/\.tsx\.js/g, '.js');

  // Fix path imports
  const newContent = content.replace(/from '(#src\/[^']*)'/g, (match, p1) => {
    if (p1.endsWith('.js')) return match;
    const isDir = fs.existsSync(path.join(process.cwd(), p1.replace('#src', 'src')));
    if (isDir && fs.lstatSync(path.join(process.cwd(), p1.replace('#src', 'src'))).isDirectory()) {
       return `from '${p1}/index.js'`;
    }
    return `from '${p1}.js'`;
  }).replace(/from '(#lib\/[^']*)'/g, (match, p1) => {
    if (p1.endsWith('.js')) return match;
    const isDir = fs.existsSync(path.join(process.cwd(), p1.replace('#lib', 'src/lib')));
    if (isDir && fs.lstatSync(path.join(process.cwd(), p1.replace('#lib', 'src/lib'))).isDirectory()) {
       return `from '${p1}/index.js'`;
    }
    return `from '${p1}.js'`;
  });
  
  if (content !== newContent) {
    fs.writeFileSync(file, newContent);
    console.log(`Updated ${file}`);
  }
}
