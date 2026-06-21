import { useCategories } from './useFilterData';
import { useFilterState } from './useFilterState';
import { useTranslation } from '@/hooks';
import { getTranslatedCategoryName } from '@/services/category/utils';
import { logger } from '@/lib/logger';

import { LoadingContainer } from '@/components/ui/feedback/LoadingContainer';

export function CategoryGrid({ mode }: { mode?: 'public' | 'admin' }) {
  const { filters, updateFilters } = useFilterState();
  const { data: categories, isPending } = useCategories();
  logger.debug('[CategoryGrid] categories fetched');
  const { appLang, uiTranslations } = useTranslation();

  if (isPending) {
    return (
      <div className="p-4 pt-0">
        <LoadingContainer loading={true} type="skeleton" skeletonType="grid" skeletonCount={6}>
          <div />
        </LoadingContainer>
      </div>
    );
  }

  // ✅ 固定 8 個：全部 + 前 7 個分類
  const displayCategories = [
    { id: null, name: '全部', code: 'all' },
    ...(categories?.slice(0, 7) || [])
  ];

  return (
    <div className="grid grid-cols-4 gap-1.5 select-none">
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
              px-2 py-2 rounded-xl text-[13px] font-semibold truncate transition-all duration-300 active:scale-95
              ${isSelected
                ? 'bg-primary text-text-on-primary shadow-md'
                : 'bg-surface-soft text-text-sub hover:text-text-main hover:bg-surface-mute'
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
