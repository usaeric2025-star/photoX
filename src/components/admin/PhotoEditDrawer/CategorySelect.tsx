import { usePhotoEditSessionContext } from '@/hooks/photo/usePhotoEditSessionContext';
import { FormSectionHeader, CategoryGrid } from '../FormShared';
import { useCategories } from '../../../hooks';
import { useUIStore } from '../../../store';

import { ProductFormData } from '@/types';

/**
 * Encapsulated Category Selector for Photo Edit Drawer
 */
export function CategorySelect() {
  const { watch, setValue } = usePhotoEditSessionContext();
  const appLang = useUIStore((s) => s.appLang);
  const { data: categories = [] } = useCategories();
  
  const formState = watch();
  const updateForm = (updates: Partial<ProductFormData>) => {
    Object.entries(updates).forEach(([key, value]) => {
      (setValue as any)(key as any, value, { shouldDirty: true });
    });
  };

  return (
    <section className="space-y-4">
      <FormSectionHeader title="产品目录" subtitle="CATEGORY *" />
      <CategoryGrid 
        categories={categories}
        selectedId={formState.category_id ?? null}
        onSelect={(id) => updateForm({ category_id: id })}
        appLang={appLang}
      />
    </section>
  );
}
