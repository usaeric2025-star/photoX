import fs from 'fs';
import path from 'path';

function removeWrappers(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf8');

  // React.useMemo(() => Object, [deps]) -> Object
  content = content.replace(/React\.useMemo\(\(\) => \(\{([\s\S]*?)\}\), \[.*?\]\);/g, '({$1});');
  content = content.replace(/useMemo\(\(\) => \(\{([\s\S]*?)\}\), \[.*?\]\);/g, '({$1});');

  // React.useMemo(() => { ... }, [deps]) -> (() => { ... })()
  content = content.replace(/React\.useMemo\(\(\) => \{([\s\S]*?)\}, \[.*?\]\);/g, '(() => {$1})();');
  content = content.replace(/useMemo\(\(\) => \{([\s\S]*?)\}, \[.*?\]\);/g, '(() => {$1})();');
  
  // React.useMemo(() => ( ... ), [deps]) -> ...
  content = content.replace(/React\.useMemo\(\(\) => \(([\s\S]*?)\), \[.*?\]\);/g, '$1;');
  content = content.replace(/useMemo\(\(\) => \(([\s\S]*?)\), \[.*?\]\);/g, '$1;');

  // useCallback(() => { ... }, [deps]) -> () => { ... }
  content = content.replace(/React\.useCallback\(\(\) => \{([\s\S]*?)\}, \[.*?\]\);/g, '() => {$1};');
  content = content.replace(/useCallback\(\(\) => \{([\s\S]*?)\}, \[.*?\]\);/g, '() => {$1};');

  fs.writeFileSync(filePath, content, 'utf8');
}

[
  'src/hooks/photo/usePublicPhotos.ts',
  'src/hooks/admin/useAdminPhotos.ts',
  'src/hooks/photo/useLightbox.ts',
  'src/hooks/photo/usePhotoGallery.ts',
  'src/hooks/photo/useUrlFilters.ts',
  'src/components/groups/GroupPhotoPicker.tsx',
  'src/components/lightbox/GroupLightbox.tsx',
  'src/components/photo/VirtualPhotoGrid.tsx',
  'src/hooks/photo/usePhotoEditSession.ts',
  'src/hooks/photo/PhotoEditSessionProvider.tsx',
  'src/hooks/photo/useInvalidatePhotos.ts',
  'src/hooks/photo/usePhotoSelection.ts',
  'src/hooks/core/useTasks.tsx',
  'src/hooks/core/useFormDraft.ts'
].forEach(p => {
  try {
    removeWrappers(p);
    console.log(`Optimized ${p}`);
  } catch (e) {
    console.log(`Failed ${p}`);
  }
});
