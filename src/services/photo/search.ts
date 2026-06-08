import { supabase } from '../../lib/supabase';
import { normalizeSearchQuery } from '@/lib/utils';

export async function findPhotoIdsBySearch(q: string): Promise<string[]> {
  const normSearchQuery = normalizeSearchQuery(q);
  if (!normSearchQuery) return [];

  const escapedQ = normSearchQuery.replace(/[\\%_]/g, '\\$&');
  
  const [tagsRes, catsRes] = await Promise.all([
    supabase.from('tags').select('id').ilike('name', `%${escapedQ}%`),
    (async () => {
      try {
        const res = await supabase.from('categories').select('id').or(`name.ilike.%${escapedQ}%,zh.ilike.%${escapedQ}%,en.ilike.%${escapedQ}%,ms.ilike.%${escapedQ}%`);
        if (res.error) {
          const fallback = await supabase.from('categories').select('id').ilike('name', `%${escapedQ}%`);
          if (fallback.error) throw fallback.error;
          return fallback;
        }
        return res;
      } catch {
        return await supabase.from('categories').select('id').ilike('name', `%${escapedQ}%`);
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
