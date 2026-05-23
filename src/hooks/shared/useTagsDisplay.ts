import { useMemo } from 'react';
import { Tag, AppSettings } from '@/types';
import { useGalleryStore } from '@/store';

export function useTagsDisplay(tags: Tag[], settings?: AppSettings) {
  
  const pinnedIds = useMemo(() => {
    return (settings?.pinned_tags || []).map(id => String(id));
  }, [settings?.pinned_tags]);

  const hotIds = useMemo(() => {
    const hotTagsCount = settings?.hot_tags_count ?? 9;
    const hotTagThreshold = settings?.hot_tag_threshold ?? 1;

    const candidates = tags.map(tag => ({
      ...tag,
      hot_score: tag.hot_score || 0
    })).filter(tag => 
      !tag.is_pinned && 
      !pinnedIds.includes(String(tag.id)) && 
      (tag.hot_score || 0) >= hotTagThreshold
    );

    const sorted = [...candidates].sort((a, b) => {
      const diff = (b.hot_score || 0) - (a.hot_score || 0);
      if (diff !== 0) return diff;
      return (a.name || '').localeCompare(b.name || '', 'zh-CN');
    });

    const hot = sorted.slice(0, hotTagsCount);
    return new Set(hot.map(t => String(t.id)));
  }, [tags, pinnedIds, settings?.hot_tags_count, settings?.hot_tag_threshold]);

  const tagsToRender = useMemo(() => {
    return [...tags].sort((a, b) => {
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
  }, [tags, hotIds, pinnedIds]);

  return { tagsToRender, pinnedIds, hotIds };
}
