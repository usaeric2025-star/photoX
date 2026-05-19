const fs = require('fs');

const files = [
  'src/hooks/usePhotoMutations.ts',
  'src/hooks/photoAi/useGroupPhotoAI.ts',
  'src/hooks/photoAi/useSinglePhotoAI.ts',
  'src/hooks/photoAi/usePhotoAI.ts',
  'src/hooks/photoAi/useBatchPhotoAI.ts',
  'src/hooks/mutations/useSyncMutation.ts',
  'src/hooks/mutations/useGroupOperations.ts',
  'src/hooks/mutations/useUpdatePhoto.ts',
  'src/hooks/mutations/useDeletePhoto.ts',
  'src/hooks/mutations/useGroupCoverMutation.ts',
  'src/hooks/mutations/useBatchEditMutation.ts',
  'src/hooks/useSyncEngine.ts',
  'src/hooks/useAdminCategory.ts',
  'src/hooks/usePhotoImport.ts'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  
  if (content.includes('queryClient.cancelQueries({ queryKey: QUERY_KEYS.photos })')) {
      content = content.replace(/queryClient\.cancelQueries\(\{ queryKey: QUERY_KEYS\.photos \}\)/g, 
        "queryClient.cancelQueries({ queryKey: ['photos'] })");
  }

  if (content.includes('queryClient.invalidateQueries({ queryKey: QUERY_KEYS.photos })')) {
    content = content.replace(/queryClient\.invalidateQueries\(\{ queryKey: QUERY_KEYS\.photos \}\)/g, 
      `(() => { const currentFilters = 'infinite' as any; queryClient.invalidateQueries({ queryKey: ['photos', currentFilters] }); queryClient.invalidateQueries({ queryKey: ['photos', 'group'] }); })()`);
  }

  fs.writeFileSync(file, content);
}
