import React, { useEffect } from 'react';
import { queryClient } from '#lib/query/index.js';
import { loadCategoriesFromCloud } from '#src/services/category/queries.js';
import { loadTagsFromCloud } from '#src/services/tag/queries.js';
import { queryKeys } from '#lib/query/keys.js';
import { AdminPageContent } from './AdminPageContent.js';
import { useTranslation } from '#src/hooks/index.js';

export default function AdminPage() {
  const { t, appLang } = useTranslation();

  useEffect(() => {
    document.title = t('adminPanelTitle');
    
    if (!window.location.pathname.startsWith('/admin')) {
      console.warn('[Admin] Pathname deviation detected:', window.location.pathname);
    }
    
    // Prefetch categories in the background
    queryClient.prefetchQuery({
      queryKey: queryKeys.categories.list(),
      queryFn: () => loadCategoriesFromCloud(),
    });

    // Prefetch tags in the background
    queryClient.prefetchQuery({
      queryKey: queryKeys.tags.list(),
      queryFn: () => loadTagsFromCloud(),
    });
  }, [appLang]);

  return (
    <AdminPageContent />
  );
};
