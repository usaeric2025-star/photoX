const fs = require('fs');
const file = 'src/lib/ui/toast.ts';
let content = fs.readFileSync(file, 'utf8');

const target = `          if (ctx.originalError) {
            return extractSystemMsg(ctx.originalError) + details;
          }
          if (ctx.original) {
            return extractSystemMsg(ctx.original) + details;
          }
        }

        if (obj.cause) {
          return extractSystemMsg(obj.cause) + details;
        }`;

const replacement = `          if (ctx.originalError) {
            details += ' \\n↳ 原因: ' + extractSystemMsg(ctx.originalError);
          } else if (ctx.original) {
            details += ' \\n↳ 原因: ' + extractSystemMsg(ctx.original);
          }
        }

        if (obj.cause) {
          details += ' \\n↳ 内部原因: ' + extractSystemMsg(obj.cause);
        }`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(file, content);
  console.log('Success');
} else {
  console.log('Target not found');
}
