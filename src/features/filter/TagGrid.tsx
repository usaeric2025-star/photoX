import React, { useState } from 'react';
import { ChevronUp, MoreHorizontal } from 'lucide-react';
import { useTags } from './useFilterData';
import { useFilterState } from './useFilterState';
import { usePublicSettings } from '@/hooks/settings/useSettings';
import { usePhotoFilter } from '@/hooks/photo/usePhotoFilter';

export function TagGrid() {
  const [showAll, setShowAll] = useState(false);
  const { filters, updateFilters } = useFilterState();
  const { data: tags, isPending } = useTags();
  const { data: settings } = usePublicSettings();

  // Use the standard hook to resolve sorted, pinned, and hot tags according to database parameters
  const { tagsToRender, pinnedIds, hotIds } = usePhotoFilter(tags || [], settings);

  const toggleTag = (tagId: string) => {
    if (filters.tagIds.includes(tagId)) {
      updateFilters({ tagIds: filters.tagIds.filter((id: string) => id !== tagId) });
    } else {
      updateFilters({ tagIds: [...filters.tagIds, tagId] });
    }
  };

  const clearTags = () => {
    updateFilters({ tagIds: [] });
  };

  const displayTags = showAll ? tagsToRender : tagsToRender.slice(0, 30);

  if (isPending) {
    return (
      <div className="flex flex-wrap gap-1.5 p-4 pt-0">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-6 w-12 bg-gray-100 animate-pulse rounded-full" />
        ))}
      </div>
    );
  }

  const hasSelectedTags = filters.tagIds.length > 0;

  return (
    <div className="p-4 pt-0 flex gap-3 items-start select-none">
      {/* Left side: Tag container with height restriction for 2 rows initially */}
      <div className={`flex flex-wrap gap-2 flex-1 min-w-0 transition-all duration-300 ${
        showAll ? 'max-h-96' : 'max-h-[56px]'
      } overflow-y-auto pr-1`}>
        {displayTags.map(tag => {
          const isSelected = filters.tagIds.includes(tag.id);
          const isPinned = pinnedIds.includes(String(tag.id)) || tag.is_pinned;
          const isHot = hotIds.has(String(tag.id));

          return (
            <button
              key={tag.id}
              onClick={() => toggleTag(tag.id)}
              className={`px-2 py-1 rounded-sm text-[10px] font-black transition-all duration-200 cursor-pointer flex items-center gap-1 border shadow-xs leading-none uppercase ${
                isSelected
                  ? 'bg-slate-950 text-white border-slate-950 scale-105 z-10'
                  : isPinned
                  ? 'bg-brand-gold/15 text-brand-gold border-brand-gold/30 hover:bg-brand-gold/25'
                  : isHot
                  ? 'bg-rose-50 text-rose-600 border-rose-200 shadow-sm hover:bg-rose-100'
                  : 'bg-slate-50 text-slate-500 border-slate-100/80 hover:border-slate-200 hover:bg-slate-100'
              }`}
            >
              {isPinned && <span className="text-[9px]">📌</span>}
              {!isPinned && isHot && <span className="text-[9px] animate-pulse">🔥</span>}
              <span className="tracking-tight">{tag.name}</span>
            </button>
          );
        })}
      </div>

      {/* Right side: Actions container */}
      <div className="flex flex-col gap-1.5 shrink-0 self-start">
        <button
          onClick={() => setShowAll(!showAll)}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer shrink-0 border border-slate-100 shadow-sm flex items-center justify-center min-w-[56px]"
          aria-label={showAll ? '收起' : '更多'}
        >
          {showAll ? <ChevronUp className="w-4 h-4" /> : <MoreHorizontal className="w-4 h-4" />}
        </button>
        {hasSelectedTags && (
          <button
            onClick={clearTags}
            className="px-2 py-1.5 rounded-lg text-[9px] font-black tracking-tighter uppercase bg-rose-500 text-white hover:bg-rose-600 active:scale-95 transition-all cursor-pointer border border-rose-400 shadow-sm flex items-center justify-center"
          >
            重置
          </button>
        )}
      </div>
    </div>
  );
}
