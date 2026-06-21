import { glob } from 'glob';
import fs from 'fs';

const files = glob.sync('src/**/*.{ts,tsx}');
let changed = 0;

function toKebabCase(str) {
  return str.replace(/([A-Z])/g, (match, offset) => (offset > 0 ? '-' : '') + match.toLowerCase())
    .replace(/-+/g, '-').toLowerCase();
}

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  let originalContent = content;

  // We look for name="CamelCase" or name="PascalCase"
  content = content.replace(/name=(["'])([^"']+)\1/g, (match, quote, nameValue) => {
    // Only convert if it contains uppercase characters
    if (/[A-Z]/.test(nameValue)) {
      return `name=${quote}${toKebabCase(nameValue)}${quote}`;
    }
    return match;
  });

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    changed++;
  }
}
console.log(`Updated ${changed} files to kebab-case strings.`);
