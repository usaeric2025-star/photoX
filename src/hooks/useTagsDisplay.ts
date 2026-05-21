import { useMemo } from 'react';
import { Tag, AppSettings } from '../types';
import { useGalleryStore } from '../store';

export function useTagsDisplay(tags: Tag[], settings?: AppSettings) {
  const tagStats = useGalleryStore(s => s.tagStats);
  
  const pinnedIds = useMemo(() => {
    return (settings?.pinned_tags || []).map(id => String(id));
  }, [settings?.pinned_tags]);

  const hotIds = useMemo(() => {
    const hotTagsCount = settings?.hot_tags_count ?? 9;
    const hotTagThreshold = settings?.hot_tag_threshold ?? 1;

    const candidates = tags.map(tag => ({
      ...tag,
      usage_count: Math.max(tag.usage_count || 0, tagStats?.[String(tag.id)] || 0)
    })).filter(tag => 
      !tag.is_pinned && 
      !pinnedIds.includes(String(tag.id)) && 
      (tag.usage_count || 0) >= hotTagThreshold
    );

    const sorted = [...candidates].sort((a, b) => {
      const diff = (b.usage_count || 0) - (a.usage_count || 0);
      if (diff !== 0) return diff;
      return (a.zh || a.name || '').localeCompare(b.zh || b.name || '', 'zh-CN');
    });

    const hot = sorted.slice(0, hotTagsCount);
    return new Set(hot.map(t => String(t.id)));
  }, [tags, pinnedIds, settings?.hot_tags_count, settings?.hot_tag_threshold, tagStats]);

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
      
      const countA = Math.max(a.usage_count || 0, tagStats?.[String(a.id)] || 0);
      const countB = Math.max(b.usage_count || 0, tagStats?.[String(b.id)] || 0);
      return countB - countA || (a.zh || a.name || '').localeCompare(b.zh || b.name || '', 'zh-CN');
    });
  }, [tags, hotIds, pinnedIds, tagStats]);

  return { tagsToRender, pinnedIds, hotIds };
}
