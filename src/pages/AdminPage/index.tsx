import React, { useEffect } from 'react';
import { mutate } from '#lib/query/index.js';
import { loadCategoriesFromCloud } from '#src/services/category/queries.js';
import { loadTagsFromCloud } from '#src/services/tag/queries.js';
import { queryKeys } from '#lib/query/keys.js';
import { AdminPageContent } from './AdminPageContent.js';
import { useUI } from '#lib/store/index.js';
import { translations } from '#src/locales/index.js';

export default function AdminPage() {
  const appLang = useUI((s) => s.appLang);
  const t = translations[appLang as keyof typeof translations] || translations.en;

  useEffect(() => {
    document.title = t.adminPanelTitle;
    
    if (!window.location.pathname.startsWith('/admin')) {
      console.warn('[Admin] Pathname deviation detected:', window.location.pathname);
    }
    
    // Prefetch categories in the background
    mutate(queryKeys.categories.categories(), loadCategoriesFromCloud());

    // Prefetch tags in the background
    mutate(queryKeys.tags.tags(), loadTagsFromCloud());
  }, [appLang]);

  return (
    <AdminPageContent />
  );
};
