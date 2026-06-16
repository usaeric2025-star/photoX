import { useCategories } from '../hooks/useFilterData';
import { useFilterState } from '../hooks/useFilterState';
import { useTranslation } from '@/hooks';
import { getTranslatedCategoryName } from '@/services/category/utils';

export function CategoryGrid() {
  const { filters, updateFilters } = useFilterState();
  const { data: categories, isPending } = useCategories();
  console.log('[CategoryGrid] categories:', categories);
  const { appLang, uiTranslations } = useTranslation();

  if (isPending) {
    return (
      <div className="flex flex-wrap gap-2 p-4 pt-0">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-7 w-16 bg-gray-100 animate-pulse rounded-md" />
        ))}
      </div>
    );
  }

  // ✅ 固定 8 個：全部 + 前 7 個分類
  const displayCategories = [
    { id: null, name: '全部', code: 'all' },
    ...(categories?.slice(0, 7) || [])
  ];

  return (
    <div className="grid grid-cols-4 gap-2 px-4 pb-4 select-none">
      {displayCategories.map(cat => {
        const isSelected = (!filters.categoryId && cat.id === null) || 
                          (filters.categoryId && cat.id !== null && String(filters.categoryId) === String(cat.id));

        const categoryName = cat.id === null 
          ? (uiTranslations.all || '全部')
          : getTranslatedCategoryName(cat.id, categories || [], appLang, uiTranslations);

        return (
          <button
            key={cat.id ?? 'all'}
            onClick={() => updateFilters({ categoryId: cat.id })}
            className={`
              px-3 py-2.5 rounded-xl text-[13px] font-medium truncate transition-all duration-200
              ${isSelected
                ? 'bg-brand-gold text-slate-950 shadow-md transform scale-[1.02]'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100 hover:border-brand-gold/30'
              }
            `}
          >
            {categoryName}
          </button>
        );
      })}
    </div>
  );
}
