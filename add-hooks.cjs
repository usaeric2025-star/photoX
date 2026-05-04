const fs = require('fs');

const files = [
  'src/pages/PublicView.tsx',
  'src/components/AdminGalleryShell.tsx',
  'src/components/PublicGallery.tsx',
  'src/pages/AdminAdsPage.tsx',
  'src/components/PhotoEditor.tsx',
  'src/components/PhotoLightbox.tsx',
  'src/components/groups/GroupAdminShell.tsx'
];

for(let f of files) {
  if(!fs.existsSync(f)) continue;
  let code = fs.readFileSync(f, 'utf8');

  // Add import if missing
  if(!code.includes('useErrorHandler')) {
     const importStatement = "import { useErrorHandler } from '../utils/errorHandler';\n";
     const altImportStatement = "import { useErrorHandler } from '../../utils/errorHandler';\n";
     
     // Determine depth
     const depth = f.split('/').length - 2;
     const imp = depth > 1 ? altImportStatement : importStatement;
     
     const firstImportIndex = code.indexOf('import ');
     if(firstImportIndex !== -1) {
       code = code.substring(0, firstImportIndex) + imp + code.substring(firstImportIndex);
     }
  }
  
  // Replace simple errs if hook exists or we just added it, but wait, we need the hook call.
  // Actually, some components already have other hooks.
  const compStartMatch = code.match(/const\s+\w+\s*=\s*(?:<[^>]+>\s*)?\([^)]*\)\s*(?::\s*[^=]+)?\s*=>\s*\{/);
  
  if(compStartMatch && !code.includes('const { handleError } = useErrorHandler();')) {
     const insertIdx = compStartMatch.index + compStartMatch[0].length;
     code = code.substring(0, insertIdx) + "\n  const { handleError } = useErrorHandler();" + code.substring(insertIdx);
  } else {
     // try function Component() {
     const funcStartMatch = code.match(/function\s+\w+\s*\([^)]*\)\s*\{/);
     if(funcStartMatch && !code.includes('const { handleError } = useErrorHandler();')) {
       const insertIdx = funcStartMatch.index + funcStartMatch[0].length;
       code = code.substring(0, insertIdx) + "\n  const { handleError } = useErrorHandler();" + code.substring(insertIdx);
     }
  }

  // Now replace things
  code = code.replace(/console\.error\(\s*(['"`].*?['"`])\s*,\s*([a-zA-Z_0-9]+)\s*\)/g, (match, msg, errVar) => {
    return `handleError(${errVar}, ${msg})`;
  });
  code = code.replace(/console\.error\(\s*([a-zA-Z_0-9]+)\s*\)/g, (match, errVar) => {
    if (errVar !== 'error' && errVar !== 'err' && errVar !== 'e') return match;
    return `handleError(${errVar})`;
  });

  fs.writeFileSync(f, code);
  console.log('Processed', f);
}
