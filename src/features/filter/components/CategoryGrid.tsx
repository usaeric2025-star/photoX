import { useCategories } from '../hooks/useFilterData';
import { useFilterState } from '../hooks/useFilterState';
import { useTranslation } from '@/hooks';
import { getTranslatedCategoryName } from '@/services/category/utils';

export function CategoryGrid() {
  const { filters, updateFilters } = useFilterState();
  const { data: categories, isLoading } = useCategories();
  const { appLang, uiTranslations } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-2 p-4 pt-0">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-7 w-16 bg-gray-100 animate-pulse rounded-md" />
        ))}
      </div>
    );
  }

  // 分類 = [全部] + 前 7 個分類 = 8 個
  const displayCategories = [
    { id: null, zh: '全部', en: 'All', ms: 'Semua', name: '全部' },
    ...(categories?.slice(0, 7) || [])
  ];

  return (
    <div className="grid grid-cols-4 gap-1.5 p-4 pt-0 select-none">
      {displayCategories.map(cat => {
        const catName = cat.id === null 
          ? (appLang === 'zh' ? '全部' : appLang === 'en' ? 'ALL' : 'SEMUA') 
          : getTranslatedCategoryName(cat.id, categories || [], appLang, uiTranslations);
        
        const isSelected = filters.categoryId === cat.id || (!filters.categoryId && cat.id === null);

        return (
          <button
            key={cat.id ?? 'all'}
            onClick={() => updateFilters({ categoryId: cat.id })}
            className={`px-3 py-1.5 rounded-md text-[10px] font-bold tracking-wider uppercase transition-all duration-150 cursor-pointer border ${
              isSelected
                ? 'bg-slate-950 text-white border-slate-950 shadow-sm shadow-slate-950/10'
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-350 hover:text-slate-950'
            }`}
          >
            {catName}
          </button>
        );
      })}
    </div>
  );
}
