const fs = require('fs');
let code = fs.readFileSync('vite.config.ts', 'utf8');

code = code.replace("import babel from '@rolldown/plugin-babel';", "");
code = code.replace(/babel\(\{[\s\S]*?\}\),/, "");
code = code.replace("react(),", "react({ babel: { plugins: [['babel-plugin-react-compiler', ReactCompilerConfig]] } }),");

fs.writeFileSync('vite.config.ts', code);
