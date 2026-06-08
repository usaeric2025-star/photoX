import { Photo } from '../../types';
import { supabase } from '../../lib/supabase';
import { parseTranslation } from './mapping';

export async function hydrateGroupInfo(photos: Photo[]): Promise<Photo[]> {
  const groupIds = Array.from(new Set(photos.map(p => p.group_id).filter(Boolean))) as string[];
  if (groupIds.length === 0) return photos;

  try {
    const { data: groupsData, error: groupsError } = await supabase
      .from('groups')
      .select('id, name, colors, cover_photo_id, member_count')
      .in('id', groupIds);

    if (groupsError) {
      console.warn('[hydrateGroupInfo] Failed to fetch groups:', groupsError);
      return photos;
    }

    const groupMap = new Map<string, any>();
    groupsData?.forEach(g => {
      const dbColors = g.colors;
      let colorValue: string | null = null;
      if (Array.isArray(dbColors) && dbColors.length > 0) {
        colorValue = dbColors[0];
      } else if (typeof dbColors === 'string') {
        colorValue = dbColors;
      }
      
      groupMap.set(String(g.id), {
        id: String(g.id),
        name: parseTranslation(g.name),
        color: colorValue || '#3b82f6',
        cover_photo_id: g.cover_photo_id || null,
        member_count: g.member_count ?? 1
      });
    });

    return photos.map(p => {
      if (p.group_id && groupMap.has(p.group_id)) {
        return {
          ...p,
          group: groupMap.get(p.group_id)
        };
      }
      return p;
    });
  } catch (e) {
    console.error('[hydrateGroupInfo] Error during client-side hydration:', e);
    return photos;
  }
}
