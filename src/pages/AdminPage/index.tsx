import React, { useEffect } from 'react';
import { mutate } from '@/lib/query';
import { loadCategoriesFromCloud } from '@/services/category/queries';
import { loadTagsFromCloud } from '@/services/tag/queries';
import { queryKeys } from '@/lib/query/keys';
import { AdminPageContent } from './AdminPageContent';
import { useUI } from '@/lib/store';
import { translations } from '@/locales';

export default function AdminPage() {
  const appLang = useUI((s) => s.appLang);
  const t = translations[appLang as keyof typeof translations] || translations.en;

  useEffect(() => {
    document.title = t.adminPanelTitle;
    // Prefetch categories in the background
    mutate(queryKeys.categories.categories(), loadCategoriesFromCloud());

    // Prefetch tags in the background
    mutate(queryKeys.tags.tags(), loadTagsFromCloud());
  }, [appLang]);

  return (
    <AdminPageContent />
  );
};
