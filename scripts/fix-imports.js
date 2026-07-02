import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

async function fixImports() {
  const files = await glob('{api,src}/**/*.{ts,tsx}', { ignore: 'node_modules/**' });
  
  for (const file of files) {
    let content = fs.readFileSync(file, 'utf-8');
    let modified = false;

    // Fix relative paths with extra spaces
    // e.g., "../ _lib" -> "../_lib"
    // e.g., "../ ../" -> "../../"
    const relativePathRegex = /\.\.\/\s+/g;
    if (relativePathRegex.test(content)) {
      content = content.replace(relativePathRegex, '../');
      modified = true;
    }

    // Fix missing .js extensions for relative imports starting with ./ or ../
    // but not ending in .js, .css, .svg, etc.
    const importRegex = /import\s+.*?\s+from\s+['"](\.\.?\/[^'"]+)(?<!\.js)['"]/g;
    content = content.replace(importRegex, (match, p1) => {
      // If it doesn't end in .js, add it
      if (!p1.endsWith('.js') && !p1.endsWith('.css') && !p1.endsWith('.svg') && !p1.endsWith('.png')) {
        modified = true;
        return match.replace(p1, `${p1}.js`);
      }
      return match;
    });

    // Fix alias imports missing .js or index.js
    // e.g., "#lib/utils" -> "#lib/utils.js" (if utils.ts exists)
    // e.g., "#src/types" -> "#src/types/index.js" (if types is a dir)
    const aliasRegex = /from\s+['"](#(src|lib|api|shared)\/[^'"]+)(?<!\.js)['"]/g;
    content = content.replace(aliasRegex, (match, p1) => {
       modified = true;
       // For simplicity, we'll try adding .js or /index.js based on common patterns
       // or just add .js and let the next pass fix index.js
       return match.replace(p1, `${p1}.js`);
    });

    if (modified) {
      fs.writeFileSync(file, content);
      console.log(`✅ Fixed: ${file}`);
    }
  }
}

fixImports().catch(console.error);
