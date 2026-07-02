
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

async function fixImports() {
  const files = await glob('{api,src}/**/*.{ts,tsx}', { ignore: 'node_modules/**' });

  for (const file of files) {
    let content = fs.readFileSync(file, 'utf-8');
    const fileDir = path.dirname(file);
    let modified = false;

    // Regex to find imports ending in .js (from a previously bad fix)
    const importRegex = /(from\s+['"])([^'"]+)(\.js)(['"])/g;
    
    content = content.replace(importRegex, (match, prefix, importPath, ext, suffix) => {
      // Check if it's a directory
      const resolvedPath = path.resolve(fileDir, importPath);
      
      if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
         modified = true;
         return `${prefix}${importPath}/index.js${suffix}`;
      }
      
      return match;
    });

    if (modified) {
      fs.writeFileSync(file, content);
      console.log(`✅ Fixed: ${file}`);
    }
  }
}

fixImports().catch(console.error);
