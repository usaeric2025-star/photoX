const fs = require('fs');
let file = 'src/lib/error/ErrorFactory.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /throw this\.create\(`\$\{res\.status\} \$\{res\.statusText \|\| 'HTTP Error'\}\`, \{\n\s*code: ErrorCode\.NETWORK_ERROR,\n\s*statusCode: res\.status,\n\s*userMessage: fallbackMessage,\n\s*\}\);/g,
  `const urlStr = res.url ? new URL(res.url).pathname : '';
            throw this.create(\`\${res.status} \${res.statusText || 'HTTP Error'} \${urlStr}\`.trim(), {
              code: res.status === 404 ? ErrorCode.NOT_FOUND : ErrorCode.NETWORK_ERROR,
              statusCode: res.status,
              userMessage: fallbackMessage,
            });`
);

fs.writeFileSync(file, content);
