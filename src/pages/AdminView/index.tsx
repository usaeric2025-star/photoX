import { createStaleTime } from '@/shared/freshnessSchema';
import React, { useEffect } from 'react';
console.log('AdminView 开始渲染');
import { useQueryClient } from '@tanstack/react-query';
import { loadCategoriesFromCloud } from '@/services/category/queries';
import { loadTagsFromCloud } from '@/services/tag/queries';
import { syncCache } from '@/lib/db/indexedDB';
import { photoKeys } from '@/lib/queryKeys';
import { AdminViewContent } from './AdminViewContent';

export const AdminView: React.FC = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Prefetch categories in the background
    queryClient.prefetchQuery({
      queryKey: photoKeys.categories(),
      queryFn: async () => {
        const cats = await loadCategoriesFromCloud();
        syncCache.saveCategories(cats).catch(() => {});
        return cats;
      },
      staleTime: createStaleTime('STABLE'),
    });

    // Prefetch tags in the background
    queryClient.prefetchQuery({
      queryKey: photoKeys.tags(),
      queryFn: async () => {
        const tags = await loadTagsFromCloud();
        syncCache.saveTags(tags).catch(() => {});
        return tags;
      },
      staleTime: createStaleTime('STABLE'),
    });
  }, [queryClient]);

  return (
    <AdminViewContent />
  );
};

export default AdminView;
