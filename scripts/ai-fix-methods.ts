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
const methodsToFix = [
  'createElement',
  'getContext',
  'getByText',
  'getAllByText',
  'queryByText',
  'import',
  'concat',
  'split',
  'format',
  'test',
  'getByTestId',
  'getAllByTestId',
  'dataset',
  'set',
  'get'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  methodsToFix.forEach(method => {
    // We are looking for method.ARGUMENT which should be method('ARGUMENT')
    // Remember, it became method.ARGUMENT where ARGUMENT is alphanumeric
    const regex = new RegExp(`\\b${method}\\.([a-zA-Z0-9_]+)\\b`, 'g');
    content = content.replace(regex, `${method}('$1')`);
  });

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Restored methods in ${file}`);
  }
});
