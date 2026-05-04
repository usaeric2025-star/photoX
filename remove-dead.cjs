const fs = require('fs');
let code = fs.readFileSync('src/components/SettingsScreen.tsx', 'utf8');

const sIdx = code.indexOf('{/* removed dead ad block */}');
const eIdx = code.indexOf('          )}', sIdx);

if (sIdx !== -1 && eIdx !== -1) {
  code = code.substring(0, sIdx) + code.substring(eIdx + '          )}'.length);
  fs.writeFileSync('src/components/SettingsScreen.tsx', code);
  console.log('Removed dead ad block');
} else {
  console.log('Could not find block');
}
