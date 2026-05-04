const fs = require('fs');

const filesToUpdate = [
  'src/components/admin/AdminMainScreen.tsx',
  'src/components/groups/GroupAdminShell.tsx',
  'src/components/AdminGalleryShell.tsx',
  'src/components/PhotoLightbox.tsx',
  'src/components/PublicGallery.tsx',
  'src/pages/PublicView.tsx',
  'src/hooks/useAdminCategory.ts',
  'src/hooks/useAdminPhotos.ts',
  'src/hooks/useAdminData.ts',
  'src/hooks/usePhotoManagement.ts',
  'src/hooks/useSyncEngine.ts'
];

for (const file of filesToUpdate) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  // Replace simple console.error(..., err) with handleError if useErrorHandler is available
  if (content.includes('useErrorHandler') || content.includes('handleError')) {
    // Only replace where err/e is passed
    content = content.replace(/console\.error\(\s*(['"`].*?['"`])\s*,\s*([a-zA-Z_0-9]+)\s*\)/g, (match, msg, errVar) => {
      return `handleError(${errVar}, ${msg})`;
    });
    content = content.replace(/console\.error\(\s*([a-zA-Z_0-9]+)\s*\)/g, (match, errVar) => {
      if (errVar !== 'error' && errVar !== 'err' && errVar !== 'e') return match;
      return `handleError(${errVar})`;
    });
  }

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
}
