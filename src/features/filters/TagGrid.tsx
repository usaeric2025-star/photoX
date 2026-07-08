import React, { useState } from 'react';
import { Icon } from '#src/components/ui/Icon.js';
import { useTags, useTagSorting } from '#src/hooks/tag/index.js';
import { useFilterState, useTranslation } from '#src/hooks/index.js';
import { usePublicSettings } from '#src/hooks/settings/useSettings.js';
import { useUI } from '#lib/store/index.js';
import { translations } from '#src/locales/index.js';
import type { FilterState } from './types.js';

interface TagButtonProps {
  tag: { id: number | string; name: string; isPinned?: boolean };
  isSelected: boolean;
  isPinned: boolean;
  isHot: boolean;
  currentFilters: FilterState;
  onClick: () => void;
}

function TagButton({ tag, isSelected, isPinned, isHot, currentFilters, onClick }: TagButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all duration-300 cursor-pointer flex items-center gap-1 leading-none border ${
        isSelected
          ? 'bg-slate-900 text-white border-slate-900 shadow-sm scale-105'
          : isPinned
          ? 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100'
          : isHot
          ? 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100'
          : 'bg-white text-slate-500 border-slate-200 hover:text-slate-900 hover:bg-slate-50 shadow-sm'
      }`}
    >
      {isPinned && <span className="text-[10px]">📌</span>}
      {!isPinned && isHot && <span className="text-[10px] animate-pulse">🔥</span>}
      <span className="tracking-tight truncate max-w-[80px]">{tag.name}</span>
    </button>
  );
}

export function TagGrid({ onClose }: { onClose?: () => void }) {
  const { filters, updateFilters } = useFilterState();
  const { tags, isLoading: isPending } = useTags();
  const { data: settings } = usePublicSettings();
  
  const appLang = useUI(s => s.appLang);
  const { t } = useTranslation();

  // Use the standard hook to resolve sorted, pinned, and hot tags according to database parameters
  const { tagsToRender, pinnedIds, hotIds } = useTagSorting(tags || [], settings);

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

  if (isPending) {
    const defaultPillWidths = ['w-16', 'w-20', 'w-14', 'w-24', 'w-16', 'w-20', 'w-12', 'w-16'];
    return (
      <div className="border-t border-border-soft/50 pt-5 mt-1">
        <div className="flex flex-wrap gap-2.5">
          {defaultPillWidths.map((width, i) => (
            <div key={i} className={`animate-shimmer h-6 rounded-full bg-surface-soft ${width}`} />
          ))}
        </div>
      </div>
    );
  }

  const hasSelectedTags = filters.tagIds.length > 0;

  return (
    <div className="border-t border-border-soft/50 pt-3 mt-1">
      <div className="flex items-center justify-between pb-2">
        <span className="text-[11px] font-bold text-text-mute uppercase tracking-tight">
          🏷️ {t('tagFilter', tagsToRender.length)}
        </span>
        {hasSelectedTags && (
          <button
            onClick={clearTags}
            className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-danger/10 text-danger hover:bg-danger/20 transition cursor-pointer"
          >
            {t('reset')}
          </button>
        )}
      </div>

      <div className="flex gap-3 items-start select-none">
        {/* Tag container - show all tags with scroll if too many */}
        <div className="flex flex-wrap gap-2.5 flex-1 min-w-0 pr-1 max-h-60 sm:max-h-80 overflow-y-auto custom-scrollbar px-1 py-1">
          {tagsToRender.map(tag => {
            const isSelected = filters.tagIds.includes(String(tag.id));
            const isPinned = pinnedIds.includes(String(tag.id)) || !!tag.isPinned;
            const isHot = hotIds.has(String(tag.id));

            return (
              <TagButton
                key={tag.id}
                tag={tag}
                isSelected={isSelected}
                isPinned={isPinned}
                isHot={isHot}
                currentFilters={filters}
                onClick={() => toggleTag(String(tag.id))}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
