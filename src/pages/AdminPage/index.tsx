import React, { useEffect } from 'react';
import { queryClient } from '#lib/query/index.js';
import { queryKeys } from '#lib/query/keys.js';
import { AdminPageContent } from './AdminPageContent.js';
import { useTranslation } from '#src/hooks/index.js';
import { api } from '#lib/api.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import type { Category, Tag } from '#src/types/index.js';

import { useNormalizedLocation } from '#src/hooks/core/index.js';

export default function AdminPage() {
  const { t, appLang } = useTranslation();
  const [location] = useNormalizedLocation();

  useEffect(() => {
    document.title = t('adminPanelTitle');
    
    const isAdmin = location.startsWith('/admin') || 
                  location.startsWith('/settings') || 
                  location.startsWith('/diagnostics');
    
    if (!isAdmin) {
      console.warn('[Admin] Pathname deviation detected:', location);
    }
    
    // Prefetch categories in the background
    queryClient.prefetchQuery({
      queryKey: queryKeys.categories.list(),
      queryFn: async () => {
        return ErrorFactory.unwrap<Category[]>(
          api.categories.$get(),
          'Prefetch categories failed'
        );
      },
    });

    // Prefetch tags in the background
    queryClient.prefetchQuery({
      queryKey: queryKeys.tags.list(),
      queryFn: async () => {
        return ErrorFactory.unwrap<Tag[]>(
          api.tags.$get(),
          'Prefetch tags failed'
        );
      },
    });
  }, [appLang]);

  return (
    <AdminPageContent />
  );
};
