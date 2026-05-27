import fs from 'fs';
import path from 'path';

const translationsKeys = [
  'galleryName', 'gallerySub', 'photosUnit', 'search', 'allCats',
  'name', 'category', 'description', 'tags', 'close', 'empty',
  'whatsAppInquiry', 'dimensions', 'length', 'width', 'height',
  'manufacturer', 'manualId', 'staffUnlock', 'staffUnlockSub',
  'points', 'cancel', 'done', 'selected', 'share', 'all',
  'uncategorized', 'login', 'addPhoto', 'batchAi', 'selectMode',
  'cancelSelect', 'settings', 'shareTitle', 'sharePrompt', 'unnamed',
  'sysCode', 'selectContact', 'contactNo', 'googleLogin',
  'loginFailed', 'invalidKey', 'keyPlaceholder', 'unlock',
  'aiAnalyzing', 'sortOldest', 'sortNewest', 'confirmDelete',
  'shareMsgCount', 'shareNotSupported', 'merge', 'delete', 'edit',
  'furnitureRecord', 'furniture', 'adminTitle', 'adminSub',
  'loginFailedAlert', 'googleLoginBtn', 'localLoginBtn',
  'localLoginPrompt', 'wrongPassword', 'backToGallery',
  'pushSuccess', 'pushSuccessMsg', 'pushFail', 'pullSuccess',
  'pullSuccessMsg', 'pullFail', 'uploadProgress', 'processing',
  'doNotClose', 'confirmDeleteSingle', 'saveSuccess', 'refresh',
  'loading', 'imageLoadFailed', 'infiniteOn', 'lazyOn',
  'infiniteEnabled', 'enableInfinite', 'showAllPhotos', 'lazyLoading',
  'exitGuestView', 'systemSettings', 'exitStaffMode', 'editProduct',
  'addProduct', 'code', 'model', 'productName', 'price', 'others',
  'multiLangDesc', 'skipCancel', 'confirmDeleteProduct',
  'confirmDeleteMsg', 'deletePhotoTitle', 'saveProduct',
  'dimensionsTitle', 'part', 'unit', 'dimensionContent', 'addSpec',
  'deleteSpec', 'zhDesc', 'enDesc', 'msDesc', 'aiRecognize',
  'statusHidden', 'statusPublic', 'seriesStory', 'loadMore',
  'endOfList'
];

function walk(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      results.push(filePath);
    }
  }
  return results;
}

const files = walk('./src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  content = content.replace(/\bt\('([a-zA-Z0-9_]+)'\)/g, (match, p1) => {
    if (!translationsKeys.includes(p1)) {
      return `t.${p1}`;
    }
    return match;
  });

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Reverted bad t('prop') in ${file}`);
  }
});
