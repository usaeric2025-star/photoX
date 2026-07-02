import React from 'react';
import { useFilterState, useFilters } from './useFilters.js';
import { Icon } from '#src/components/ui/Icon.js';
import { cn } from '#lib/utils.js';

export function SortToggle() {
  const { filters, updateFilters } = useFilterState();
  const isNewest = filters.sort === 'newest';

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateFilters({ sort: isNewest ? 'oldest' : 'newest' });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "h-10 px-3 flex items-center gap-2 rounded-full bg-surface-soft text-text-main border border-border-bold hover:bg-surface-mute transition-all active:scale-95 shrink-0 cursor-pointer",
        !isNewest && "bg-primary/5 border-primary/30"
      )}
      title={isNewest ? '排序: 從新到舊' : '排序: 從舊到新'}
    >
      <Icon 
        name="arrow-up-down" 
        size={16} 
        className={cn("transition-transform duration-300 text-text-sub", !isNewest && "rotate-180 text-primary")} 
      />
      <span className={cn(
        "text-[13px] font-bold hidden sm:inline",
        !isNewest ? "text-primary" : "text-text-main"
      )}>
        {isNewest ? '最新' : '最舊'}
      </span>
    </button>
  );
}
