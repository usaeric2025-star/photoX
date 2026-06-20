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
    let content = fs.readFileSync(filePath, 'utf8');
    // Replace: from '@react-zero-ui/icon-sprite'
    // With:    from '@/components/ui/Icon'
    const newContent = content.replace(/from ['"]@react-zero-ui\/icon-sprite['"]/g, "from '@/components/ui/Icon'");
    
    if (content !== newContent) {
        console.log(`Fixing import in: ${filePath}`);
        fs.writeFileSync(filePath, newContent, 'utf8');
    }
});

console.log('Migration fix complete!');
