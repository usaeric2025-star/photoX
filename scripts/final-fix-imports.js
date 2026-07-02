
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

    // Matches imports with or without .js
    const importRegex = /(from\s+['"])([^'"]+)(['"])/g;
    content = content.replace(importRegex, (match, prefix, importPath, suffix) => {
        // Strip existing extension if any, to re-resolve
        let baseImportPath = importPath;
        if (baseImportPath.endsWith('.js')) {
            baseImportPath = baseImportPath.slice(0, -3);
        }
        
        let resolvedPath;
        if (importPath.startsWith('#')) {
            for (const [alias, target] of Object.entries(aliasMap)) {
                if (baseImportPath.startsWith(alias)) {
                    resolvedPath = path.resolve(process.cwd(), baseImportPath.replace(alias, target));
                    break;
                }
            }
        } else {
            resolvedPath = path.resolve(fileDir, baseImportPath);
        }
        
        if (!resolvedPath) return match;

        // Try extensions
        if (fs.existsSync(resolvedPath + '.ts')) {
             modified = true;
             return `${prefix}${baseImportPath}.js${suffix}`;
        }
        if (fs.existsSync(resolvedPath + '/index.ts')) {
             modified = true;
             return `${prefix}${baseImportPath}/index.js${suffix}`;
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
