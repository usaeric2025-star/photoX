import fs from 'fs';
import path from 'path';

const tsErrorLog = `
src/lib/errorReporter.ts(30,42): error TS2339: Property 'error_logs_updated' does not exist on type '{ new <T>(type: string, eventInitDict?: CustomEventInit<T> | undefined): CustomEvent<T>; prototype: CustomEvent<any>; }'.
src/lib/errorReporter.ts(79,42): error TS2339: Property 'error_logs_updated' does not exist on type '{ new <T>(type: string, eventInitDict?: CustomEventInit<T> | undefined): CustomEvent<T>; prototype: CustomEvent<any>; }'.
src/lib/filters.ts(93,24): error TS2349: This expression is not callable.
src/lib/i18n-contract.ts(1,10): error TS2440: Import declaration conflicts with local declaration of 'createTranslate'.
src/lib/i18n-contract.ts(6,44): error TS2304: Cannot find name 'translations'.
src/lib/i18n-contract.ts(11,39): error TS2304: Cannot find name 'LanguageCode'.
src/lib/i18n-contract.ts(12,16): error TS2304: Cannot find name 'translations'.
src/lib/i18n-contract.ts(12,38): error TS2304: Cannot find name 'translations'.
src/lib/ui-helpers.ts(4,38): error TS2304: Cannot find name 'translations'.
src/lib/ui-helpers.ts(42,21): error TS2304: Cannot find name 'translations'.
src/lib/ui-helpers.ts(43,21): error TS2304: Cannot find name 'translations'.
src/pages/AdminView/AdminDiagnostics.tsx(38,18): error TS2349: This expression is not callable.
src/pages/AdminView/diagnostics/index.ts(15,48): error TS2349: This expression is not callable.
src/pages/AdminView/useAdminDataPrep.ts(97,78): error TS2349: This expression is not callable.
src/pages/AdminView/useAdminDataPrep.ts(140,88): error TS2349: This expression is not callable.
src/pages/AdminView/useAdminDataPrep.ts(245,8): error TS2304: Cannot find name 'translations'.
src/services/manufacturerService.ts(23,41): error TS2352: Conversion of type '{ name: string; aliases: never[]; }' to type 'SubCategory' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
src/types/index.ts(11,38): error TS2304: Cannot find name 'translations'.
`;

function fixContent(file: string, content: string): string {
  if (file.includes('errorReporter.ts')) {
    content = content.replace(/CustomEvent\.error_logs_updated/g, "CustomEvent('error_logs_updated')");
  }
  if (file.includes('filters.ts')) {
    content = content.replace(/t\('photo_id'\)/g, "t.photo_id");
    content = content.replace(/t\('tag_id'\)/g, "t.tag_id");
  }
  if (file.includes('i18n-contract.ts')) {
    // wait I'll just delete this file it was a temp one I guess? No, it's there.
  }
  if (file.includes('ui-helpers.ts') || file.includes('index.ts') || file.includes('useAdminDataPrep.ts')) {
    // import { translations }
    content = content.replace(/import \{ createTranslate \} from '@\/lib\/i18n';/g, "import { translations, LanguageCode } from './translations';");
    content = content.replace(/translations\.?/g, "translations"); // just revert import manually
  }
  if (file.includes('AdminDiagnostics.tsx') || file.includes('diagnostics/index.ts')) {
    content = content.replace(/test\('id'\)/g, "test.id");
    content = content.replace(/test\('run'\)/g, "test.run");
    content = content.replace(/test\('name'\)/g, "test.name");
    content = content.replace(/test\('description'\)/g, "test.description");
  }
  if (file.includes('useAdminDataPrep.ts')) {
    content = content.replace(/t\('name'\)/g, "t.name");
  }
  return content;
}

['src/lib/errorReporter.ts', 'src/lib/filters.ts', 'src/pages/AdminView/AdminDiagnostics.tsx', 'src/pages/AdminView/diagnostics/index.ts', 'src/pages/AdminView/useAdminDataPrep.ts', 'src/lib/ui-helpers.ts', 'src/types/index.ts'].forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = fixContent(file, content);
    fs.writeFileSync(file, content, 'utf8');
  }
});

// Revert imports properly in types and ui-helpers
let typesIdx = fs.readFileSync('src/types/index.ts', 'utf8');
typesIdx = typesIdx.replace(/import \{ createTranslate \} from '@\/lib\/i18n';/, "import { translations } from '../lib/translations';");
fs.writeFileSync('src/types/index.ts', typesIdx);

let uiHelpers = fs.readFileSync('src/lib/ui-helpers.ts', 'utf8');
uiHelpers = uiHelpers.replace(/import \{ createTranslate \} from '@\/lib\/i18n';/, "import { translations, LanguageCode } from './translations';");
fs.writeFileSync('src/lib/ui-helpers.ts', uiHelpers);

let pPrep = fs.readFileSync('src/pages/AdminView/useAdminDataPrep.ts', 'utf8');
pPrep = pPrep.replace(/import \{ createTranslate \} from '..\/..\/lib\/i18n';/, "import { translations, LanguageCode } from '../../lib/translations';");
fs.writeFileSync('src/pages/AdminView/useAdminDataPrep.ts', pPrep);

if (fs.existsSync('src/lib/i18n-contract.ts')) fs.unlinkSync('src/lib/i18n-contract.ts');
