const fs = require('fs');

const report = JSON.parse(fs.readFileSync('knip-report.json', 'utf-8'));

for (const issue of report.issues) {
  const filePath = issue.file;
  if (!fs.existsSync(filePath)) continue;
  
  let lines = fs.readFileSync(filePath, 'utf-8').split('\n');
  let changed = false;

  const itemsToRemove = [];
  if (issue.exports) itemsToRemove.push(...issue.exports);
  if (issue.types) itemsToRemove.push(...issue.types);
  if (issue.nsExports) itemsToRemove.push(...issue.nsExports);
  if (issue.nsTypes) itemsToRemove.push(...issue.nsTypes);

  // We sort by line descending so modifying lines doesn't offset subsequent lines if we were to delete lines.
  // We're just removing "export " though, so length doesn't change, but it's good practice.
  itemsToRemove.sort((a, b) => b.line - a.line);

  for (const item of itemsToRemove) {
    const lineIdx = item.line - 1;
    if (lines[lineIdx]) {
      // Find "export " and replace it.
      // Need to handle "export const", "export type", "export interface", "export class", "export function", "export {"
      // We can just replace the first occurrence of "export " on that line.
      if (/^\s*export\s+/.test(lines[lineIdx])) {
        lines[lineIdx] = lines[lineIdx].replace(/^\s*export\s+(default\s+)?/, '');
        changed = true;
      } else if (/\bexport\s+/.test(lines[lineIdx])) {
         lines[lineIdx] = lines[lineIdx].replace(/\bexport\s+(default\s+)?/, '');
         changed = true;
      }
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, lines.join('\n'));
    console.log(`Updated ${filePath}`);
  }
}
