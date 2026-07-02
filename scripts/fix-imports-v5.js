import { execSync } from 'child_process';
import fs from 'fs';

const files = execSync('find api src -name "*.ts" -o -name "*.tsx"', { encoding: 'utf-8' }).split('\n').filter(Boolean);

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  
  // Fix double .js.js
  content = content.replace(/\.js\.js/g, '.js');
  
  // Ensure .js is present if not already, but handle index.js
  content = content.replace(/from '(\.[^']*)'/g, (match, p1) => {
    if (p1.endsWith('.js')) return match;
    const p = p1.endsWith('/') ? p1 + 'index' : p1;
    return `from '${p}.js'`;
  });
  
  // Fix imports that were already .js but got messed up by previous scripts
  content = content.replace(/\.js\.js/g, '.js');

  fs.writeFileSync(file, content);
}
