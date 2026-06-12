import React from 'react';
import { FormSectionHeader, CategoryGrid } from '../FormShared';
import { useCategories } from '../../../hooks';
import { useUIStore } from '../../../store';
import { PhotoEditFormReturn } from '@/hooks/photo/types';

import { ProductFormData } from '@/types';

interface CategorySelectorProps {
  form: PhotoEditFormReturn;
}

/**
 * Encapsulated Category Selector for Photo Edit Drawer
 */
export function CategorySelect({ form }: CategorySelectorProps) {
  const appLang = useUIStore((s) => s.appLang);
  const { data: categories = [] } = useCategories();
  
  const formState = form.watch();
  const updateForm = (updates: Partial<ProductFormData>) => {
    Object.entries(updates).forEach(([key, value]) => {
      form.setValue(key as any, value);
    });
  };

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
