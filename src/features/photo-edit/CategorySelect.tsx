import React from 'react';
import { usePhotoEditSessionContext } from './hooks/PhotoEditSession.js';
import { FormSectionHeader } from '#src/components/admin/FormShared.js';
import { useCategories, useTranslation } from '#src/hooks/index.js';
import { getTranslatedCategoryName } from "#src/utils/category.js";

/**
 * CategorySelect
 * 
 * 照片編輯對話框中的分類選擇組件。
 */
export function CategorySelect() {
  const { form } = usePhotoEditSessionContext();
  const { appLang, uiTranslations, t } = useTranslation();
  const { categories = [] } = useCategories();
  
  return (
    <form.Field name="categoryId">
      {(field) => (
        <section className="space-y-4">
          <FormSectionHeader title={t('category') || '分類'} />
          <div className="grid grid-cols-4 gap-1.5 px-0.5">
            {categories
              .filter((cat) => cat && cat.id)
              .map((cat) => {
                const isSelected = String(field.state.value || "") === String(cat.id || "");
                const displayName = getTranslatedCategoryName(
                  cat.id as any,
                  categories,
                  appLang,
                  uiTranslations,
                );
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => field.handleChange(isSelected ? null : String(cat.id))}
                    className={`flex flex-col items-center justify-center py-4 px-1 rounded-xl border-2 transition-all ${isSelected ? "bg-blue-600 border-blue-600 shadow-md shadow-blue-600/20" : "bg-white border-slate-100 active:bg-slate-50"}`}
                  >
                    <span
                      className={`font-black text-[10px] leading-tight text-center uppercase tracking-tighter ${isSelected ? "text-white" : "text-slate-700"}`}
                    >
                      {displayName}
                    </span>
                  </button>
                );
              })}
          </div>
        </section>
      )}
    </form.Field>
  );
}
