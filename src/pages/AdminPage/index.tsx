import { createStaleTime } from '@/shared/freshnessSchema';
import React, { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { loadCategoriesFromCloud } from '@/services/category/queries';
import { loadTagsFromCloud } from '@/services/tag/queries';
import { syncCache } from '@/lib/db/indexedDB';
import { queryKeys } from '@/lib/query/keys';
import { AdminPageContent } from './AdminPageContent';
import { useUIStore } from '@/store/useUIStore';

export function AdminPage() {
  const queryClient = useQueryClient();

  const appLang = useUIStore((s) => s.appLang);

  useEffect(() => {
    document.title = appLang === 'zh' ? 'PhotoX | 管理后台' : 'PhotoX | Admin';
    // Prefetch categories in the background
    queryClient.prefetchQuery({
      queryKey: queryKeys.categories.categories(),
      queryFn: async () => {
        const cats = await loadCategoriesFromCloud();
        syncCache.saveCategories(cats).catch(() => {});
        return cats;
      },
      staleTime: createStaleTime('STABLE'),
    });

    // Prefetch tags in the background
    queryClient.prefetchQuery({
      queryKey: queryKeys.tags.tags(),
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
