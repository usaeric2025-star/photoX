import React from 'react';
import { useFilters } from '#src/hooks/index.js';
import { Icon } from '#src/components/ui/Icon.js';
import { cn } from '#lib/utils.js';

export function SortToggle() {
  const { filters, updateFilters } = useFilters();
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
        "h-10 px-3 flex items-center gap-2 rounded-lg bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all active:scale-95 shrink-0 cursor-pointer",
        !isNewest && "bg-slate-50 border-slate-300 text-slate-900"
      )}
      title={isNewest ? '排序: 從新到舊' : '排序: 從舊到新'}
    >
      <Icon 
        name="arrow-up-down" 
        size={16} 
        className={cn("transition-transform duration-300", !isNewest && "rotate-180 text-primary")} 
      />
      <span className={cn(
        "text-[13px] font-medium hidden sm:inline",
        !isNewest ? "text-slate-900" : "text-slate-600"
      )}>
        {isNewest ? '最新' : '最舊'}
      </span>
    </button>
  );
}
