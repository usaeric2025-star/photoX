import { supabase } from '../../lib/supabase';
import { normalizeSearchQuery } from '@/lib/utils';

export async function findPhotoIdsBySearch(q: string): Promise<string[]> {
  const normSearchQuery = normalizeSearchQuery(q);
  if (!normSearchQuery) return [];

  const escapedQ = normSearchQuery.replace(/[\\%_]/g, '\\$&');
  
  const [tagsRes, catsRes] = await Promise.all([
    (async () => {
      try {
        const res = await supabase.from('tags').select('id').ilike('name', `%${escapedQ}%`);
        if (res.error) {
          const jsonRes = await supabase.from('tags').select('id').or(`name->>zh.ilike.%${escapedQ}%`);
          if (jsonRes.error) return { data: [] };
          return jsonRes;
        }
        return res;
      } catch {
        return { data: [], error: null };
      }
    })(),
    (async () => {
      try {
        // Assume name is JSONB
        const res = await supabase.from('categories').select('id').or(`name->>zh.ilike.%${escapedQ}%,name->>en.ilike.%${escapedQ}%,name->>ms.ilike.%${escapedQ}%`);
        if (res.error) {
          // Fallback if name is string or standard text columns exist
          const fallback = await supabase.from('categories').select('id').or(`name.ilike.%${escapedQ}%,zh.ilike.%${escapedQ}%,en.ilike.%${escapedQ}%,ms.ilike.%${escapedQ}%`);
          if (fallback.error) {
            const basicFallback = await supabase.from('categories').select('id').ilike('name', `%${escapedQ}%`);
            if (basicFallback.error) return { data: [] }; // Don't crash search if categories table fails
            return basicFallback;
          }
          return fallback;
        }
        return res;
      } catch {
        return { data: [], error: null }; // Fail silently so search continues for photos/tags
      }
    })()
  ]);

  if (tagsRes.error) throw tagsRes.error;
  if (catsRes.error) throw catsRes.error;

  const tagIds = (tagsRes.data || []).map(t => t.id);
  const catIds = (catsRes.data || []).map(c => c.id);

  let photoIdsFromTags: string[] = [];
  if (tagIds.length > 0) {
    const { data: ptData, error: ptError } = await supabase.from('photo_tags').select('photo_id').in('tag_id', tagIds);
    if (ptError) throw ptError;
    if (ptData) photoIdsFromTags = ptData.map(pt => pt.photo_id);
  }

  // We return segments for OR query or specific IDs
  return {
    catIds,
    photoIdsFromTags,
    q: escapedQ
  } as any;
}

export function buildSearchFilter(catIds: number[], photoIdsFromTags: string[], q: string) {
  let orSegments = [
    `name->>zh.ilike.%${q}%`,
    `name->>en.ilike.%${q}%`,
    `name->>ms.ilike.%${q}%`,
    `manual_code.ilike.%${q}%`,
    `model_number.ilike.%${q}%`,
    `description->>zh.ilike.%${q}%`,
    `description->>en.ilike.%${q}%`,
    `description->>ms.ilike.%${q}%`,
    `item_code.ilike.%${q}%`
  ];

  if (catIds.length > 0) {
    orSegments.push(`category_id.in.(${catIds.join(',')})`);
  }

  if (photoIdsFromTags.length > 0) {
    orSegments.push(`id.in.(${photoIdsFromTags.join(',')})`);
  }

  return orSegments.join(',');
}
