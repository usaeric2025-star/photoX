import { glob } from 'glob';
import fs from 'fs';

const files = glob.sync('src/**/*.{ts,tsx}');
let changed = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  let newContent = content
    .replace(/<Icon\s+name=/g, '<LucideIcon name=')
    .replace(/<Icon\n\s+name=/g, '<LucideIcon\n  name=')
    .replace(/import\s+{\s*Icon\s*}\s+from\s+['"]@\/components\/ui\/Icon['"]/g, "import { LucideIcon } from '@/components/ui/Icon'");
    
  if (content !== newContent) {
    fs.writeFileSync(file, newContent);
    changed++;
  }
}
console.log(`Updated ${changed} files.`);
