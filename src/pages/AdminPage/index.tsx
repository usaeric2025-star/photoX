import { createStaleTime } from '@/shared/freshnessSchema';
import React, { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { loadCategoriesFromCloud } from '@/services/category/queries';
import { loadTagsFromCloud } from '@/services/tag/queries';
import { syncCache } from '@/lib/db/indexedDB';
import { categoryKeys, tagKeys } from '@/lib/queryKeys';
import { AdminPageContent } from './AdminPageContent';
import { useUIStore } from '@/store/useUIStore';

export function AdminPage() {
  const queryClient = useQueryClient();

  const { appLang } = useUIStore();

  useEffect(() => {
    document.title = appLang === 'zh' ? 'PhotoX | 管理后台' : 'PhotoX | Admin';
    // Prefetch categories in the background
    queryClient.prefetchQuery({
      queryKey: categoryKeys.categories(),
      queryFn: async () => {
        const cats = await loadCategoriesFromCloud();
        syncCache.saveCategories(cats).catch(() => {});
        return cats;
      },
      staleTime: createStaleTime('STABLE'),
    });

    // Prefetch tags in the background
    queryClient.prefetchQuery({
      queryKey: tagKeys.tags(),
      queryFn: async () => {
        const tags = await loadTagsFromCloud();
        syncCache.saveTags(tags).catch(() => {});
        return tags;
      },
      staleTime: createStaleTime('STABLE'),
    });
  }, [queryClient]);

  return (
    <AdminPageContent />
  );
};

export default AdminPage;
