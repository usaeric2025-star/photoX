import { glob } from 'glob';
import fs from 'fs';

const files = glob.sync('src/**/*.{ts,tsx}');
let changed = 0;

const replacements = {
  'alertcircle': 'alert-circle',
  'alerttriangle': 'alert-triangle',
  'refreshcw': 'refresh-cw',
  'xcircle': 'x-circle',
  'layoutgrid': 'layout-grid',
  'wifioff': 'wifi-off',
  'trash2': 'trash-2',
  'loader2': 'loader-2',
  'checkcircle2': 'check-circle-2',
  'checksquare': 'check-square',
  'layoutdashboard': 'layout-dashboard',
  'logout': 'log-out'
};

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  let originalContent = content;

  for (const [wrong, right] of Object.entries(replacements)) {
    content = content.replace(new RegExp(`name="${wrong}"`, 'g'), `name="${right}"`);
  }

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    changed++;
  }
}
console.log(`Updated ${changed} files with fixed kebab-case strings.`);
