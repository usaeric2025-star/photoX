import React, { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useTags } from './useFilterData';
import { useFilterState } from './useFilterState';
import { usePublicSettings } from '@/hooks/settings/useSettings';
import { usePhotoFilter } from '@/hooks/photo/usePhotoFilter';
import { useUI } from '@/lib/store';
import { translations } from '@/locales';

export function TagGrid({ onClose }: { onClose?: () => void }) {
  const { filters, updateFilters } = useFilterState();
  const { data: tags, isPending } = useTags();
  const { data: settings } = usePublicSettings();
  
  const appLang = useUI(s => s.appLang);
  const t = translations[appLang as keyof typeof translations] || translations.en;

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
    const defaultPillWidths = ['w-16', 'w-20', 'w-14', 'w-24', 'w-16', 'w-20', 'w-12', 'w-16'];
    return (
      <div className="border-t border-border-soft/50 pt-5 mt-1">
        <div className="flex flex-wrap gap-2.5">
          {defaultPillWidths.map((width, i) => (
            <div key={i} className={`animate-shimmer h-6 rounded-full ${width}`} />
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
          🏷️ {t.tagFilter(tagsToRender.length)}
        </span>
        {hasSelectedTags && (
          <button
            onClick={clearTags}
            className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-danger/10 text-danger hover:bg-danger/20 transition cursor-pointer"
          >
            {t.reset}
          </button>
        )}
      </div>

      <div className="flex gap-3 items-start select-none">
        {/* Tag container - show all tags with scroll if too many */}
        <div className="flex flex-wrap gap-2.5 flex-1 min-w-0 pr-1 max-h-60 sm:max-h-80 overflow-y-auto custom-scrollbar px-1 py-1">
          {tagsToRender.map(tag => {
            const isSelected = filters.tagIds.includes(String(tag.id));
            const isPinned = pinnedIds.includes(String(tag.id)) || tag.is_pinned;
            const isHot = hotIds.has(String(tag.id));

            return (
              <button
                key={tag.id}
                onClick={() => toggleTag(String(tag.id))}
                className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-300 cursor-pointer flex items-center gap-1 leading-none ${
                  isSelected
                    ? 'bg-primary text-text-on-primary shadow-sm scale-105'
                    : isPinned
                    ? 'bg-warning/15 text-warning hover:bg-warning/25'
                    : isHot
                    ? 'bg-danger/5 text-danger hover:bg-danger/10'
                    : 'bg-surface-soft text-text-sub hover:text-text-main hover:bg-surface-mute shadow-sm'
                }`}
              >
                {isPinned && <span className="text-[10px]">📌</span>}
                {!isPinned && isHot && <span className="text-[10px] animate-pulse">🔥</span>}
                <span className="tracking-tight truncate max-w-[80px]">{tag.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
