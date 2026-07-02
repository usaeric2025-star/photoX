import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

const aliasMap = {
  '#shared/': './shared/',
  '#api/': './api/',
  '#src/': './src/',
  '#lib/': './src/lib/'
};

async function fixImports() {
  const files = await glob('{api,src}/**/*.{ts,tsx}', { ignore: 'node_modules/**' });

  for (const file of files) {
    let content = fs.readFileSync(file, 'utf-8');
    const fileDir = path.dirname(file);
    let modified = false;

    const importRegex = /((?:from|import\(|import)\s+['"])([^'"]+)(['"]\)?)/g;
    
    content = content.replace(importRegex, (match, prefix, importPath, suffix) => {
      if (!importPath.startsWith('.') && !importPath.startsWith('#')) return match;
      if (importPath.endsWith('.css')) return match;

      let baseImportPath = importPath;
      if (baseImportPath.endsWith('.js')) {
          baseImportPath = baseImportPath.slice(0, -3);
      }
      
      // If it ends in /index, try the parent first
      if (baseImportPath.endsWith('/index')) {
          const parentPath = baseImportPath.slice(0, -6);
          let parentAbsolutePath;
          if (parentPath.startsWith('#')) {
              for (const [alias, target] of Object.entries(aliasMap)) {
                  if (parentPath.startsWith(alias)) {
                      parentAbsolutePath = path.resolve(process.cwd(), parentPath.replace(alias, target));
                      break;
                  }
              }
          } else {
              parentAbsolutePath = path.resolve(fileDir, parentPath);
          }

          if (parentAbsolutePath && (fs.existsSync(parentAbsolutePath + '.ts') || fs.existsSync(parentAbsolutePath + '.tsx'))) {
              modified = true;
              return `${prefix}${parentPath}.js${suffix}`;
          }
      }

      let absolutePath;
      if (importPath.startsWith('#')) {
          for (const [alias, target] of Object.entries(aliasMap)) {
              if (baseImportPath.startsWith(alias)) {
                  absolutePath = path.resolve(process.cwd(), baseImportPath.replace(alias, target));
                  break;
              }
          }
      } else {
          absolutePath = path.resolve(fileDir, baseImportPath);
      }
      
      if (!absolutePath) return match;

      let newImportPath = null;

      if (fs.existsSync(absolutePath + '.ts') || fs.existsSync(absolutePath + '.tsx')) {
          newImportPath = baseImportPath + '.js';
      }
      else if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isDirectory()) {
          if (fs.existsSync(path.join(absolutePath, 'index.ts')) || fs.existsSync(path.join(absolutePath, 'index.tsx'))) {
              newImportPath = baseImportPath.endsWith('/') ? baseImportPath + 'index.js' : baseImportPath + '/index.js';
          }
      }

      if (newImportPath && newImportPath !== importPath) {
          modified = true;
          return `${prefix}${newImportPath}${suffix}`;
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
