import { globSync } from 'glob';
import fs from 'fs';
import { execSync } from 'child_process';

const files = globSync('src/**/*.{ts,tsx}');
const icons = new Set();

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  // Match <Icon name="xyz" or <LucideIcon name="xyz"
  const regex = /<(?:Lucide)?Icon(?:\s+[^>]*?)?\s+name=(["'])([^"']+)\1/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    icons.add(match[2]);
  }
}

// Write dummy file
const dummyContent = `
import { LucideIcon } from 'lucide-react-sprite';
export const Dummy = () => (
  <>
    ${[...icons].map(icon => `<LucideIcon name="${icon}" />`).join('\n    ')}
  </>
);
`;

fs.writeFileSync('src/icon-scan-dummy.tsx', dummyContent);

try {
  execSync('npx lucide-react-sprite generate -o public/icons.svg', { stdio: 'inherit' });
} finally {
  if (fs.existsSync('src/icon-scan-dummy.tsx')) {
    fs.unlinkSync('src/icon-scan-dummy.tsx');
  }
}
