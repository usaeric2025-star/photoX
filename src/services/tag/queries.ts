import { supabase } from '../../lib/supabase';
import { Tag } from '../../types';

let allTagsPromise: Promise<Tag[]> | null = null;
let allTagsFetchedAt = 0;
const CACHE_TTL = 30 * 1000; // 30 seconds

export const loadTagsFromCloud = async (): Promise<Tag[]> => {
    const now = Date.now();
    if (allTagsPromise && (now - allTagsFetchedAt < CACHE_TTL)) {
      return allTagsPromise;
    }

    allTagsPromise = (async () => {
      const { data, error } = await supabase
          .from('tags')
          .select('*')
          .order('name', { ascending: true });
      
      if (error) {
          return [];
      }
      
      return (data || []).map((t) => ({
        ...(t as Tag),
        name: (t.name || '').toUpperCase(),
        id: String(t.id),
        hot_score: (t as any).hot_score || 0,
        is_pinned: !!(t as any).is_pinned
      }));
    })();

    allTagsFetchedAt = now;
    return allTagsPromise;
};

/**
 * Force clear the tag cache (useful after mutations)
 */
export const clearTagCache = () => {
    allTagsPromise = null;
    allTagsFetchedAt = 0;
};
