import { glob } from 'glob';
import fs from 'fs';

const files = glob.sync('src/**/*.{ts,tsx}');
let changed = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  let newContent = content
    .replace(/<LucideIcon\s+name=/g, '<Icon name=')
    .replace(/<LucideIcon\n\s+name=/g, '<Icon\n  name=')
    .replace(/import\s+{\s*LucideIcon\s*}\s+from\s+['"]@\/components\/ui\/Icon['"]/g, "import { Icon } from '@/components/ui/Icon'");
    
  if (content !== newContent) {
    fs.writeFileSync(file, newContent);
    changed++;
  }
}
console.log(`Updated ${changed} files.`);
