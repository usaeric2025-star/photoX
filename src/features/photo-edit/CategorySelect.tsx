import { Field } from '@tanstack/react-form';
import { usePhotoEditSessionContext } from "#src/hooks/photo/usePhotoEditSessionContext";
import { FormSectionHeader } from '#src/components/admin/FormShared';
import { useCategories } from '#src/hooks';
import { useUI } from '#lib/store';
import { translations, LanguageCode } from "#src/locales";
import { getTranslatedCategoryName } from "#src/services/category/utils";

/**
 * Encapsulated Category Selector for Photo Edit Drawer
 */
export function CategorySelect() {
  const { form } = usePhotoEditSessionContext();
  const appLang = useUI((s) => s.appLang);
  const { categories = [] } = useCategories();
  
  return (
    <Field form={form} name="categoryId">
      {(field) => (
        <section className="space-y-4">
          <FormSectionHeader title="产品目录" subtitle="CATEGORY *" />
          <div className="grid grid-cols-4 gap-1.5 px-0.5">
            {categories
              .filter((cat) => cat && cat.id)
              .map((cat) => {
                const isSelected = String(field.state.value || "") === String(cat.id || "");
                const dict = translations[appLang as LanguageCode] || translations.en;
                const displayName = getTranslatedCategoryName(
                  cat.id || undefined,
                  categories,
                  appLang,
                  dict,
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
    </Field>
  );
}
