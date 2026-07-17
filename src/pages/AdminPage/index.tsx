import React, { useEffect } from 'react';
import { queryClient } from '#lib/query/index.js';
import { queryKeys } from '#lib/query/keys.js';
import { AdminPageContent } from './AdminPageContent.js';
import { useTranslation } from '#src/hooks/index.js';
import { api } from '#lib/api.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import type { Category, Tag } from '#src/types/index.js';

import { useNormalizedLocation } from '#src/hooks/core/index.js';
import { logger } from '#lib/logger.js';
import { isAdminRoute } from '#lib/routing.js';

export default function AdminPage() {
  const { t, appLang } = useTranslation();
  const [location] = useNormalizedLocation();

  useEffect(() => {
    document.title = t('adminPanelTitle');
    
    if (!isAdminRoute(location)) {
      logger.warn('[Admin] Pathname deviation detected:', location);
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
    }).catch(e => {
      logger.warn('Background prefetch categories failed', e);
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
    }).catch(e => {
      logger.warn('Background prefetch tags failed', e);
    });
  }, [appLang, location, t]);

  return (
    <AdminPageContent />
  );
}
