
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

async function fixImports() {
  const files = await glob('{api,src}/**/*.{ts,tsx}', { ignore: 'node_modules/**' });
  
  const aliasMap = {
    '#shared/': './shared/',
    '#api/': './api/',
    '#src/': './src/',
    '#lib/': './src/lib/'
  };

  for (const file of files) {
    let content = fs.readFileSync(file, 'utf-8');
    const fileDir = path.dirname(file);
    let modified = false;

    const importRegex = /(from\s+['"])([^'"]+)(['"])/g;
    content = content.replace(importRegex, (match, prefix, importPath, suffix) => {
      // Skip if already has extension
      if (importPath.endsWith('.js') || importPath.endsWith('.css')) return match;
      
      let resolvedPath;
      if (importPath.startsWith('#')) {
        for (const [alias, target] of Object.entries(aliasMap)) {
            if (importPath.startsWith(alias)) {
                resolvedPath = path.resolve(process.cwd(), importPath.replace(alias, target));
                break;
            }
        }
      } else {
        resolvedPath = path.resolve(fileDir, importPath);
      }

      if (!resolvedPath) return match;

      // Try adding .ts or /index.ts
      if (fs.existsSync(resolvedPath + '.ts')) {
        modified = true;
        return `${prefix}${importPath}.js${suffix}`;
      }
      if (fs.existsSync(resolvedPath + '/index.ts')) {
        modified = true;
        return `${prefix}${importPath}/index.js${suffix}`;
      }
      
      // If the path already has .js, but the file doesn't exist, check index.js
      if (importPath.endsWith('.js')) {
          const pathNoJs = importPath.slice(0, -3);
          const resolvedPathNoJs = path.resolve(fileDir, pathNoJs);
          if (fs.existsSync(resolvedPathNoJs + '/index.ts')) {
              modified = true;
              return `${prefix}${pathNoJs}/index.js${suffix}`;
          }
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
