import { useEffect, useState } from 'react';
import { Photo } from '../types';
import { useGalleryStore } from '../store';
import { safeArray } from '../lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

/**
 * Hook to fetch tag stats from db or use static client state once.
 */
export function useTagStats(photos: Photo[]) {
  const setTagStats = useGalleryStore(s => s.setTagStats);
  const tagStats = useGalleryStore(s => s.tagStats);
  
  // Only calculate ONCE when there's a significant number of photos to avoid jumping around
  useEffect(() => {
    if (Object.keys(tagStats).length > 0) return; // Already initialized in store
    if (!photos || photos.length < 10) return; // Wait until we have a good batch

    const counts: Record<string, number> = {};
    photos.forEach(p => {
      const tagIds = safeArray(p.tag_ids);
      tagIds.forEach(tid => {
        const strId = String(tid);
        counts[strId] = (counts[strId] || 0) + 1;
      });
    });

    setTagStats(counts);
    // Intentionally empty deps except for photos.length to avoid running often,
    // but React lint might complain if we don't include essentials.
    // We only really want to run this once when photos load for the first time.
  }, [photos.length > 10]); // Only retrigger if photos length jumps from <10 to >10

  return tagStats;
}
