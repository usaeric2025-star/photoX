import React, { useEffect } from 'react';
import { mutate } from 'swr';
import { loadCategoriesFromCloud } from '@/services/category/queries';
import { loadTagsFromCloud } from '@/services/tag/queries';
import { queryKeys } from '@/lib/query/keys';
import { AdminPageContent } from './AdminPageContent';
import { useUI } from '@/lib/store';

export default function AdminPage() {
  const appLang = useUI((s) => s.appLang);

  useEffect(() => {
    document.title = appLang === 'zh' ? 'PhotoX | 管理后台' : 'PhotoX | Admin';
    // Prefetch categories in the background
    mutate(queryKeys.categories.categories(), loadCategoriesFromCloud());

    // Prefetch tags in the background
    mutate(queryKeys.tags.tags(), loadTagsFromCloud());
  }, [appLang]);

  return (
    <AdminPageContent />
  );
};
