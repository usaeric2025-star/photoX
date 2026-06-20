
import * as fs from 'fs';
import * as path from 'path';

function walkDir(dir: string, callback: (filePath: string, content: string) => void) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            walkDir(filePath, callback);
        } else if (stat.isFile() && (filePath.endsWith('.ts') || filePath.endsWith('.tsx'))) {
            const content = fs.readFileSync(filePath, 'utf8');
            callback(filePath, content);
        }
    }
}

const srcDir = path.join(process.cwd(), 'src');
const redundant = ['react-hook-form', 'framer-motion', '@hookform/resolvers', 'react-toastify', 'react-hot-toast'];
let foundCount = 0;

walkDir(srcDir, (filePath, content) => {
    redundant.forEach(lib => {
        if (content.includes(lib)) {
            console.log(`Found ${lib} in: ${filePath}`);
            foundCount++;
        }
    });
});

if (foundCount === 0) {
    console.log('No redundant dependencies found.');
}
