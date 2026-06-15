import React, { useState } from 'react';
import { useTags } from '../hooks/useFilterData';
import { useFilterState } from '../hooks/useFilterState';
import { useSettings } from '@/hooks/settings/useSettings';
import { usePhotoFilter } from '@/hooks/photo/usePhotoFilter';

export function TagGrid() {
  const [showAll, setShowAll] = useState(false);
  const { filters, updateFilters } = useFilterState();
  const { data: tags, isLoading } = useTags();
  const { settings } = useSettings();

  // Use the standard hook to resolve sorted, pinned, and hot tags according to database parameters
  const { tagsToRender, pinnedIds, hotIds } = usePhotoFilter(tags || [], settings);

  const toggleTag = (tagId: string) => {
    if (filters.tagIds.includes(tagId)) {
      updateFilters({ tagIds: filters.tagIds.filter(id => id !== tagId) });
    } else {
      updateFilters({ tagIds: [...filters.tagIds, tagId] });
    }
  };

  const clearTags = () => {
    updateFilters({ tagIds: [] });
  };

  const displayTags = showAll ? tagsToRender : tagsToRender.slice(0, 15);

  if (isLoading) {
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
    <div className="p-4 pt-0 flex gap-4 items-start select-none">
      {/* Left side: Tag container with scroll when expanded */}
      <div className={`flex flex-wrap gap-1.5 flex-1 min-w-0 ${showAll ? 'max-h-64 overflow-y-auto pr-1' : ''}`}>
        {displayTags.map(tag => {
          const isSelected = filters.tagIds.includes(tag.id);
          const isPinned = pinnedIds.includes(String(tag.id)) || tag.is_pinned;
          const isHot = hotIds.has(String(tag.id));

          return (
            <button
              key={tag.id}
              onClick={() => toggleTag(tag.id)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-all duration-150 cursor-pointer flex items-center gap-0.5 border ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : isPinned
                  ? 'bg-amber-100 text-amber-900 border-amber-200 hover:bg-amber-200'
                  : isHot
                  ? 'bg-orange-100 text-orange-900 border-orange-200 hover:bg-orange-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {isPinned && <span className="text-[9px]">📌</span>}
              {!isPinned && isHot && <span className="text-[9px]">🔥</span>}
              <span>{tag.name}</span>
            </button>
          );
        })}
      </div>

      {/* Right side: Fixed actions container */}
      <div className="flex items-center gap-1.5 shrink-0 self-start">
        {hasSelectedTags && (
          <button
            onClick={clearTags}
            className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer border border-slate-200"
          >
            RESET
          </button>
        )}
        <button
          onClick={() => setShowAll(!showAll)}
          className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase bg-slate-50 text-slate-500 hover:bg-slate-100 cursor-pointer shrink-0 border border-slate-200"
        >
          {showAll ? '收起 ▲' : '更多...'}
        </button>
      </div>
    </div>
  );
}
