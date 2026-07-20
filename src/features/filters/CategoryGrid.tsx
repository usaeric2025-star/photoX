import React from 'react';
import { useCategories, useFilters, useTranslation } from '#src/hooks/index.js';
import { getTranslatedCategoryName } from '#src/utils/category.js';
import { logger } from '#lib/logger.js';
import type { FilterState } from './types.js';

interface CategoryButtonProps {
  cat: { id: number | null; code?: string };
  isSelected: boolean;
  categoryName: string;
  currentFilters: FilterState;
  onClick: () => void;
}

/**
 * CategoryButton
 * 
 * 單個分類按鈕。
 */
function CategoryButton({ cat, isSelected, categoryName, onClick }: CategoryButtonProps) {
  return (
    <button
      id={`category-${cat.id ?? 'all'}`}
      type="button"
      onClick={onClick}
      className={`
        px-2 py-2 rounded-lg text-[13px] font-bold truncate transition-all duration-300 active:scale-95 cursor-pointer border
        ${isSelected
          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
          : 'bg-slate-50 text-slate-500 border-slate-100 hover:text-slate-900 hover:bg-white hover:border-slate-200'
        }
      `}
    >
      {categoryName}
    </button>
  );
}

/**
 * CategoryGrid
 * 
 * 展示分類網格，支持快速切換分類過濾。
 */
export function CategoryGrid({ enabled = true }: { mode?: 'public' | 'admin', enabled?: boolean }) {
  const { filters, updateFilters } = useFilters();
  const { appLang, uiTranslations } = useTranslation();
  const { categories, isLoading: isPending } = useCategories({ enabled });

  if (isPending) {
    return (
      <div className="grid grid-cols-4 gap-1.5">
         {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-[34px] rounded-xl bg-slate-100 animate-pulse" />
         ))}
      </div>
    );
  }

  // 展示全部分類，不再限制為 7 個以確保數據可見性
  const displayCategories = [
    { id: null, code: 'all' },
    ...(categories || [])
  ];

  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 select-none">
      {displayCategories.map(cat => {
        const isSelected = (!filters.categoryId && cat.id === null) || 
                          (filters.categoryId !== null && cat.id !== null && String(filters.categoryId) === String(cat.id));
        
        const categoryName = cat.id === null 
          ? (uiTranslations.all || '全部')
          : getTranslatedCategoryName(cat.id as any, categories || [], appLang, uiTranslations);
          
        return (
          <CategoryButton
            key={cat.id ?? 'all'}
            cat={cat}
            isSelected={isSelected}
            categoryName={categoryName}
            currentFilters={filters}
            onClick={() => updateFilters({ categoryId: cat.id as any })}
          />
        );
      })}
    </div>
  );
}
