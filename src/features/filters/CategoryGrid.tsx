import { useCategories } from '#src/hooks/category/index.js';
import { useFilterState } from './useFilters.js';
import { useTranslation } from '#src/hooks/index.js';
import { getTranslatedCategoryName } from '#src/services/category/utils.js';
import { logger } from '#lib/logger.js';
import type { FilterState } from './types.js';

interface CategoryButtonProps {
  cat: { id: number | null; code?: string };
  isSelected: boolean;
  categoryName: string;
  currentFilters: FilterState;
  onClick: () => void;
}

function CategoryButton({ cat, isSelected, categoryName, currentFilters, onClick }: CategoryButtonProps) {
  return (
    <button
      id={`category-${cat.id ?? 'all'}`}
      onClick={onClick}
      className={`
        px-2 py-2 rounded-xl text-[13px] font-semibold truncate transition-all duration-300 active:scale-95 cursor-pointer
        ${isSelected
          ? 'bg-primary text-text-on-primary shadow-md'
          : 'bg-surface-soft text-text-sub hover:text-text-main hover:bg-surface-mute'
        }
      `}
    >
      {categoryName}
    </button>
  );
}

export function CategoryGrid({ mode, enabled = true }: { mode?: 'public' | 'admin', enabled?: boolean }) {
  const { filters, updateFilters } = useFilterState();
  const { appLang, uiTranslations } = useTranslation();
  const { categories, isLoading: isPending } = useCategories({ enabled });

  logger.info('[CategoryGrid] Rendering', { isPending, categoriesCount: categories?.length });

  if (isPending) {
    return (
      <div className="grid grid-cols-4 gap-1.5">
         {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-shimmer h-[34px] rounded-xl bg-surface-soft" />
         ))}
      </div>
    );
  }

  // ✅ 固定 8 個：全部 + 前 7 個分類
  const displayCategories = [
    { id: null, code: 'all' },
    ...(categories?.slice(0, 7) || [])
  ];

  return (
    <div className="grid grid-cols-4 gap-1.5 select-none">
      {displayCategories.map(cat => {
        // Fix: Use a more robust equality check for selection
        const isSelected = (!filters.categoryId && cat.id === null) || 
                          (filters.categoryId !== null && cat.id !== null && String(filters.categoryId) === String(cat.id));

        const categoryName = cat.id === null 
          ? (uiTranslations.all || '全部')
          : getTranslatedCategoryName(cat.id, categories || [], appLang, uiTranslations);

        return (
          <CategoryButton
            key={cat.id ?? 'all'}
            cat={cat}
            isSelected={isSelected}
            categoryName={categoryName}
            currentFilters={filters}
            onClick={() => updateFilters({ categoryId: cat.id })}
          />
        );
      })}
    </div>
  );
}
