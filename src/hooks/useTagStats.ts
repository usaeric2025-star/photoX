import { useEffect, useMemo } from 'react';
import { Photo } from '../types';
import { useGalleryStore } from '../store';
import { safeArray } from '../lib/utils';

/**
 * Hook to calculate and sync tag statistics from given photos.
 */
export function useTagStats(photos: Photo[]) {
  const setTagStats = useGalleryStore(s => s.setTagStats);

  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!photos || photos.length === 0) return counts;

    photos.forEach(p => {
      const tagIds = safeArray(p.tag_ids);
      tagIds.forEach(tid => {
        const strId = String(tid);
        counts[strId] = (counts[strId] || 0) + 1;
      });
    });

    return counts;
  }, [photos]);

  useEffect(() => {
    if (Object.keys(stats).length > 0) {
      setTagStats(stats);
    }
  }, [stats, setTagStats]);

  return stats;
}
