import * as fs from 'fs';
import * as path from 'path';

function walkDir(dir: string, callback: (filePath: string) => void) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            walkDir(filePath, callback);
        } else if (stat.isFile() && (filePath.endsWith('.ts') || filePath.endsWith('.tsx'))) {
            callback(filePath);
        }
    }
}

const srcDir = path.join(process.cwd(), 'src');
walkDir(srcDir, (filePath) => {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('ErrorFactory.handle')) {
        console.log(`File: ${filePath}`);
        const lines = content.split('\n');
        lines.forEach((line, index) => {
            if (line.includes('ErrorFactory.handle')) {
                console.log(`  Line ${index + 1}: ${line.trim()}`);
            }
        });
    }
});
