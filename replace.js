import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('.next') && !file.includes('dist')) {
        results = results.concat(walk(file));
      }
    } else { 
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('src');
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  content = content.replace(/photoMutationService/g, 'photoService');
  content = content.replace(/groupMutationService/g, 'groupService');
  
  // Clean up any duplicate imports that might have occurred if a file imported from both
  // Usually TS will complain about duplicates, wait, if they import both from different lines, it just uses them.
  // The only issue is if they imported from both, now they import from 'photoService' twice etc.
  
  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Updated', file);
  }
}
