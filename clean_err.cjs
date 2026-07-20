const fs = require('fs');
let file = 'src/lib/error/ErrorFactory.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /throw this\.fromUnknown\(err, \{ fallbackMessage \} \);/g,
  `if (err instanceof Error && err.name === 'TypeError' && err.message.includes('fetch')) {
        throw this.create(\`\${err.message} (Network/CORS/Down)\`, {
          code: ErrorCode.NETWORK_ERROR,
          statusCode: 0,
          userMessage: fallbackMessage,
        });
      }
      throw this.fromUnknown(err, { fallbackMessage });`
);

fs.writeFileSync(file, content);
