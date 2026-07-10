const fs = require('fs');

const path = 'src/lib/query/index.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/ErrorFactory\.handle\(error, { context: `useAppQuery: \${queryKey\.join\('-'\)}` }\);\n/g, '');
code = code.replace(/ErrorFactory\.handle\(error, { context: `useAppInfiniteQuery: \${queryKey\.join\('-'\)}` }\);\n/g, '');
code = code.replace(/ErrorFactory\.handle\(args\[0\], { context: errorContext }\);\n/g, '');

fs.writeFileSync(path, code);
