import fs from 'fs';
import path from 'path';

function walk(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      results.push(filePath);
    }
  }
  return results;
}

const files = walk('./src');

let totalReplaced = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Replace import statement
  // import { translations... } from .../translations; -> import { createTranslate } from '@/lib/i18n';
  if (content.includes('translations') && !file.includes('translations.ts') && !file.includes('i18n.ts')) {
    if (/import .*translations.* from '.*translations';/.test(content)) {
       content = content.replace(/import {?[^}]*translations[^}]*}? from '[^']+translations';/, "import { createTranslate } from '@/lib/i18n';");
       changed = true;
    }
    
    // Replace const t = translations[...]; -> const t = createTranslate(...);
    const tConfigRegex = /const t\s*=\s*(?:useMemo\(\(\)\s*=>\s*)?translations\[[^\]]+\](?:\s*\|\|\s*translations\[?\w?\'?[a-z]+\]?\'?)?(?:,\s*\[([^\]]+)\]\))?;/g;
    
    content = content.replace(/const t\s*=\s*(?:React\.)?useMemo\(\(\)\s*=>\s*translations\[([^\]]+)\](?:\s*as[^\]]+)?(?:\s*\|\|\s*translations\.?[^\s,]+)?\s*,\s*\[([^\]]+)\]\);/g, "const t = React.useMemo(() => createTranslate($1), [$2]);");
    content = content.replace(/const t\s*=\s*useMemo\(\(\)\s*=>\s*translations\[([^\]]+)\](?:\s*as[^\]]+)?(?:\s*\|\|\s*translations\.?[^\s,]+)?\s*,\s*\[([^\]]+)\]\);/g, "const t = useMemo(() => createTranslate($1), [$2]);");
    content = content.replace(/const t\s*=\s*translations\[([^\]]+)\](?:\s*as[^\]]+)?(?:\s*\|\|\s*translations\.?[^\s,]+)?;/g, "const t = createTranslate($1);");
    
    // Sometimes it's `let t = ...`
    content = content.replace(/let t\s*=\s*translations\[([^\]]+)\](?:\s*as[^\]]+)?(?:\s*\|\|\s*translations\.?[^\s,]+)?;/g, "let t = createTranslate($1);");

    if (content.includes('translations.')) {
      // Something still using translations directly?
    }

    // Now replace t.property(args) -> t('property', args)
    // We need to be careful with nested parentheses. Let's do it with a simple regex for the properties we know take args
    const funcKeys = ['gallerySub', 'confirmDelete', 'shareMsgCount', 'pushSuccessMsg'];
    for (const k of funcKeys) {
       const funcRegex = new RegExp(`t\\.${k}\\(([^)]+)\\)`, 'g');
       content = content.replace(funcRegex, `t('${k}', $1)`);
    }

    // Replace t.property -> t('property')
    // Look for t.someProp where someProp is alpha numeric
    content = content.replace(/t\.([a-zA-Z0-9_]+)/g, "t('$1')");
    
    // Replace t['property'] -> t('property')
    content = content.replace(/t\['([a-zA-Z0-9_]+)'\]/g, "t('$1')");
  }

  if (content !== fs.readFileSync(file, 'utf8')) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
    totalReplaced++;
  }
});
console.log(`Finished replacing in ${totalReplaced} files`);
