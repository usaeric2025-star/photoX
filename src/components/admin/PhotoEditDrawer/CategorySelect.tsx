import React from 'react';
import { FormSectionHeader, CategoryGrid } from '../FormShared';
import { useCategories } from '../../../hooks';
import { useUIStore } from '../../../store';
import { PhotoEditFormReturn } from '@/hooks/photo/usePhotoEdit';

import { ProductFormData } from '@/types';

interface CategorySelectorProps {
  form: PhotoEditFormReturn;
}

/**
 * Encapsulated Category Selector for Photo Edit Drawer
 */
export function CategorySelect({ form }: CategorySelectorProps) {
  const appLang = useUIStore((s: any) => s.appLang);
  const { data: categories = [] } = useCategories();
  
  const formState = form.values;
  const updateForm = (updates: Partial<ProductFormData>) => form.setValues(updates);

  return (
    <section className="space-y-4">
      <FormSectionHeader title="产品目录" subtitle="CATEGORY *" />
      <CategoryGrid 
        categories={categories}
        selectedId={formState.category_id}
        onSelect={(id) => updateForm({ category_id: id })}
        appLang={appLang}
      />
    </section>
  );
}
