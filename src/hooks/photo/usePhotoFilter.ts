import { Tag, AppSettings } from '@/types';

/**
 * usePhotoFilter
 * 處理標籤的排序與顯示邏輯，包括置頂標籤與熱門標籤。
 * 改名自 useTagFiltering。
 */
export function usePhotoFilter(tags: Tag[], settings?: AppSettings) {
  
  const pinnedIds = (settings?.pinned_tags || []).map(id => String(id));

  const hotIds = (() => {
    const hotTagsCount = settings?.hot_tags_count ?? 9;
    const hotTagThreshold = settings?.hot_tag_threshold ?? 0;

    const candidates = tags
      .filter(tag => !pinnedIds.includes(String(tag.id))) // Mutual Exclusivity: Exclude pinned tags from hot section
      .map(tag => ({
        ...tag,
        hot_score: tag.hot_score || 0
      }))
      .filter(tag => (tag.hot_score || 0) >= hotTagThreshold);

    const sorted = [...candidates].sort((a, b) => {
      const diff = (b.hot_score || 0) - (a.hot_score || 0);
      if (diff !== 0) return diff;
      return (a.name || '').localeCompare(b.name || '', 'zh-CN');
    });

    const hot = sorted.slice(0, hotTagsCount);
    return new Set(hot.map(t => String(t.id)));
  })();

  const tagsToRender = [...tags].sort((a, b) => {
    const aPinned = !!a.is_pinned || pinnedIds.includes(String(a.id));
    const bPinned = !!b.is_pinned || pinnedIds.includes(String(b.id));
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    
    const aHot = hotIds.has(String(a.id));
    const bHot = hotIds.has(String(b.id));
    if (aHot && !bHot) return -1;
    if (!aHot && bHot) return 1;
    
    const countA = a.hot_score || 0;
    const countB = b.hot_score || 0;
    return countB - countA || (a.name || '').localeCompare(b.name || '', 'zh-CN');
  });

  return { tagsToRender, pinnedIds, hotIds };
}
