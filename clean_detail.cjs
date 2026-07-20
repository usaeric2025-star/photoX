const fs = require('fs');
let file = 'api/_handlers/photos/detail.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/console\.log\('ENTER \/by-ids'\);\n\s*/, '');
content = content.replace(/console\.log\('by-ids ids:', ids\);\n\s*/, '');
content = content.replace(/console\.log\('Querying DB\.\.\.'\);\n\s*/, '');
content = content.replace(/console\.log\('Query done, returning\.\.\.'\);\n\s*/, '');

fs.writeFileSync(file, content);
