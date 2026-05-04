const fs = require('fs');
let code = fs.readFileSync('src/components/SettingsScreen.tsx', 'utf8');

const sIdx = code.indexOf('          \n                      </div>\n');
if (sIdx !== -1) {
  const eIdx = code.indexOf('        </AnimatePresence>');
  if (eIdx !== -1) {
     code = code.substring(0, sIdx) + code.substring(eIdx);
     fs.writeFileSync('src/components/SettingsScreen.tsx', code);
  }
}
