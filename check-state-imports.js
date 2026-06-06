import fs from 'fs';
import path from 'path';

function getFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const name = path.join(dir, file);
    if (fs.statSync(name).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        getFiles(name, fileList);
      }
    } else if (name.endsWith('.ts') || name.endsWith('.tsx')) {
      fileList.push(name);
    }
  }
  return fileList;
}

const files = getFiles('./src');
let issues = 0;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('useState')) {
    // We want to detect if useState is used as a standalone identifier "useState"
    // (i.e. not "React.useState" and not "useState" in imports)
    
    // Check if the file imports useState in curly braces
    const hasImport = /import\s+{[^}]*useState[^}]*}\s+from\s+['"]react['"]/g.test(content) ||
                      /import\s+useState\s+from\s+['"]react['"]/g.test(content) ||
                      /import\s+React\s*,\s*{[^}]*useState[^}]*}\s+from\s+['"]react['"]/g.test(content) ||
                      /import\s+{[^}]*useState[^}]*}\s*,\s*React\s+from\s+['"]react['"]/g.test(content);
                      
    const hasGlobalReactUseState = content.includes('React.useState');
    
    // Find standalone useState usage outside of comments & imports
    const lines = content.split('\n');
    let hasStandaloneUsage = false;
    let standaloneLines = [];
    
    lines.forEach((line, index) => {
      // Simple parse to ignore comments or imports
      if (line.trim().startsWith('import') || line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*')) {
        return;
      }
      
      // Look for useState not preceded by "React." and not followed by a colon (like a property name) unless it's a call like useState(
      // Let's use a regex to find "useState" that is not "React.useState" and not part of an object definition like "useState: "
      const match = line.match(/\buseState\b/);
      if (match) {
        // Confirm it's not React.useState
        const idx = match.index;
        const before = line.substring(Math.max(0, idx - 6), idx);
        if (!before.includes('React.')) {
          hasStandaloneUsage = true;
          standaloneLines.push({ num: index + 1, text: line.trim() });
        }
      }
    });
    
    if (hasStandaloneUsage && !hasImport) {
      console.log(`❌ File: ${file} uses standalone "useState" but does NOT import "useState"!`);
      standaloneLines.forEach(l => {
        console.log(`  Line ${l.num}: ${l.text}`);
      });
      issues++;
    }
  }
}

console.log(`Checked ${files.length} files. Found ${issues} files with unimported/unqualified useState.`);
