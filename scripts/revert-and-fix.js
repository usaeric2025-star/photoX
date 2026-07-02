
import fs from 'fs';
import { glob } from 'glob';
import path from 'path';

async function fixImports() {
  const files = await glob('{api,src}/**/*.{ts,tsx}', { ignore: 'node_modules/**' });
  
  for (const file of files) {
    let content = fs.readFileSync(file, 'utf-8');
    let modified = false;

    // 1. Revert ../../index.js to ../../
    // This is probably wrong, it should be ../../file.js
    // Let's replace any ".../index.js" with "..." and see if the file exists
    // Actually, just replace all "/index.js'" with ".js'" and check if the file exists
    
    // Simple rule: Ensure all internal imports end in .js, but NOT /index.js.
    // If it ends in /index.js, change to .js (if the file exists)
    
    // For aliases like #src/types/index.js -> #src/types.js
    const indexJsRegex = /\/(index\.js)(?=['"])/g;
    if (indexJsRegex.test(content)) {
        content = content.replace(indexJsRegex, '');
        modified = true;
    }
    
    // Now ensure all internal imports end in .js (except if they already end in .js)
    const importRegex = /from\s+['"](\.\.?\/|#)([^'"]+)(?<!\.js)['"]/g;
    content = content.replace(importRegex, (match, p1, p2) => {
        modified = true;
        return `from '${p1}${p2}.js'`;
    });

    if (modified) {
      fs.writeFileSync(file, content);
      console.log(`✅ Fixed: ${file}`);
    }
  }
}

fixImports().catch(console.error);
