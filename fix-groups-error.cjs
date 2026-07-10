const fs = require('fs');

const path = 'src/hooks/group/useGroups.ts';
let code = fs.readFileSync(path, 'utf8');

// Replace all onError: (err) => ErrorFactory.handle(...)
code = code.replace(/\s*onError:\s*\([^)]*\)\s*=>\s*ErrorFactory\.handle\([^)]+\)/g, '');
code = code.replace(/\s*onError:\s*\(err:\s*Error\)\s*=>\s*{\s*ErrorFactory\.handle\([^;]+;\s*invalidateList\(\);\s*}/g, '    onError: () => { invalidateList(); }');
code = code.replace(/\s*onError:\s*\(err:\s*Error\)\s*=>\s*{\s*ErrorFactory\.handle\([^;]+;\s*}/g, '');

fs.writeFileSync(path, code);
