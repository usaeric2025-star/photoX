import * as fs from 'fs';
import * as path from 'path';

console.log('CWD:', process.cwd());
try {
  console.log('Files in CWD:', fs.readdirSync(process.cwd()));
} catch (err: any) {
  console.error('Error listing CWD:', err.message);
}
