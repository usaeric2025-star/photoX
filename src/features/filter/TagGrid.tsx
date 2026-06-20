import React, { useState } from 'react';
import { ChevronUp, MoreHorizontal } from '@/components/ui/Icon';
import { useTags } from './useFilterData';
import { useFilterState } from './useFilterState';
import { usePublicSettings } from '@/hooks/settings/useSettings';
import { usePhotoFilter } from '@/hooks/photo/usePhotoFilter';

export function TagGrid({ onClose }: { onClose?: () => void }) {
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
    onClose?.();
  };

  const clearTags = () => {
    updateFilters({ tagIds: [] });
  };

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
    <div className="border-t border-slate-100/50 pt-3 mt-1">
      <div className="flex items-center justify-between pb-2">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
          🏷️ 標籤篩選 ({tagsToRender.length})
        </span>
        {hasSelectedTags && (
          <button
            onClick={clearTags}
            className="px-2 py-0.5 rounded-sm text-[9px] font-black bg-rose-50 text-rose-500 hover:bg-rose-100 transition cursor-pointer"
          >
            重置選擇
          </button>
        )}
      </div>

      <div className="flex gap-3 items-start select-none">
        {/* Tag container - show all tags */}
        <div className="flex flex-wrap gap-2 flex-1 min-w-0 pr-1">
          {tagsToRender.map(tag => {
            const isSelected = filters.tagIds.includes(String(tag.id));
            const isPinned = pinnedIds.includes(String(tag.id)) || tag.is_pinned;
            const isHot = hotIds.has(String(tag.id));

            return (
              <button
                key={tag.id}
                onClick={() => toggleTag(String(tag.id))}
                className={`px-1.5 py-0.5 rounded-sm text-[9px] font-medium transition-all duration-200 cursor-pointer flex items-center gap-1 border shadow-xs leading-none uppercase ${
                  isSelected
                    ? 'bg-slate-950 text-white border-slate-950 scale-105'
                    : isPinned
                    ? 'bg-brand-gold/15 text-brand-gold border-brand-gold/30 hover:bg-brand-gold/25'
                    : isHot
                    ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                    : 'bg-slate-50 text-slate-500 border-slate-100/80 hover:border-slate-200 hover:bg-slate-100'
                }`}
              >
                {isPinned && <span className="text-[8px]">📌</span>}
                {!isPinned && isHot && <span className="text-[8px] animate-pulse">🔥</span>}
                <span className="tracking-tight truncate max-w-[60px]">{tag.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
