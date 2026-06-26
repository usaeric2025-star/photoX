import fs from 'fs';
const file = 'node_modules/drizzle-kit/bin.cjs';
let code = fs.readFileSync(file, 'utf-8');
code = code.replace(/process\.stdout\.isTTY/g, 'true').replace(/process\.stdin\.isTTY/g, 'true');
fs.writeFileSync(file, code);
console.log('Patched drizzle-kit');
