import { Tag, AppSettings } from '@/types';

/**
 * useTagSorting
 * 處理標籤的排序與顯示邏輯，包括置頂標籤與熱門標籤。
 * 改名自 useTagFiltering。
 */
export function useTagSorting(tags: Tag[], settings?: AppSettings) {
  
  const pinnedIds = (settings?.pinnedTags || []).map(id => String(id));

  const hotIds = (() => {
    const hotTagsCount = settings?.hotTagsCount ?? 9;
    const hotTagThreshold = Number(settings?.hotTagThreshold ?? 0);

    const candidates = tags
      .filter(tag => !pinnedIds.includes(String(tag.id))) // Mutual Exclusivity: Exclude pinned tags from hot section
      .map(tag => ({
        ...tag,
        hotScore: tag.hotScore || 0
      }))
      .filter(tag => (tag.hotScore || 0) >= hotTagThreshold && (tag.hotScore || 0) > 0);

    const sorted = [...candidates].sort((a, b) => {
      const diff = (b.hotScore || 0) - (a.hotScore || 0);
      if (diff !== 0) return diff;
      return (a.name || '').localeCompare(b.name || '', 'zh-CN');
    });

    const hot = sorted.slice(0, hotTagsCount);
    return new Set(hot.map(t => String(t.id)));
  })();

  const tagsToRender = [...tags].sort((a, b) => {
    const aPinned = !!a.isPinned || pinnedIds.includes(String(a.id));
    const bPinned = !!b.isPinned || pinnedIds.includes(String(b.id));
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    
    const aHot = hotIds.has(String(a.id));
    const bHot = hotIds.has(String(b.id));
    if (aHot && !bHot) return -1;
    if (!aHot && bHot) return 1;
    
    const countA = a.hotScore || 0;
    const countB = b.hotScore || 0;
    return countB - countA || (a.name || '').localeCompare(b.name || '', 'zh-CN');
  });

  return { tagsToRender, pinnedIds, hotIds };
}
