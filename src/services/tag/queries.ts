import { Tag } from '#src/types';
import { api } from '#lib/api';

let allTagsPromise: Promise<Tag[]> | null = null;
let allTagsFetchedAt = 0;
const CACHE_TTL = 30 * 1000; // 30 seconds

export const loadTagsFromCloud = async (): Promise<Tag[]> => {
    const now = Date.now();
    if (allTagsPromise && (now - allTagsFetchedAt < CACHE_TTL)) {
      return allTagsPromise;
    }

    allTagsPromise = (async () => {
      try {
        const res = await api.tags.$get();
        
        if (!res.ok) {
            throw new Error(`Failed to fetch tags: ${res.statusText}`);
        }
        
        const json = await res.json();
        if (!json.success) {
          throw new Error(`Failed to load tags from API: ${json.error || 'unknown error'}`);
        }

        return ((json.data as Record<string, unknown>[]) || []).map((t) => ({
          ...(t as unknown as Tag),
          name: ((t.name as string) || '').toUpperCase(),
          id: Number(t.id) || 0,
          hot_score: (t.hot_score as number) || 0,
          is_pinned: !!t.is_pinned
        })) as unknown as Tag[];
      } catch (err) {
        allTagsPromise = null; // Clear on error so next attempt tries again
        allTagsFetchedAt = 0;
        throw err;
      }
    })();

    allTagsFetchedAt = now;
    return allTagsPromise;
};
