#!/bin/bash
cat << 'INNER_EOF' > patch.cjs
const fs = require('fs');
const file = 'src/lib/ui/toast.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /          if \(ctx\.originalError\) \{\n            return extractSystemMsg\(ctx\.originalError\) \+ details;\n          \}\n          if \(ctx\.original\) \{\n            return extractSystemMsg\(ctx\.original\) \+ details;\n          \}\n        \}\n        if \(obj\.cause\) \{\n          return extractSystemMsg\(obj\.cause\) \+ details;\n        \}/,
  `          if (ctx.originalError) {\n            details += ' \\n↳ 原因: ' + extractSystemMsg(ctx.originalError);\n          } else if (ctx.original) {\n            details += ' \\n↳ 原因: ' + extractSystemMsg(ctx.original);\n          }\n        }\n        if (obj.cause) {\n          details += ' \\n↳ 内部原因: ' + extractSystemMsg(obj.cause);\n        }`
);

fs.writeFileSync(file, content);
INNER_EOF
node patch.cjs
rm patch.cjs
