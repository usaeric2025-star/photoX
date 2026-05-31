import { supabase } from '../../lib/supabase';
import { Tag } from '../../types';

export const loadTagsFromCloud = async (): Promise<Tag[]> => {
    const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name', { ascending: true });
    
    if (error) {
        return [];
    }
    
    const result = (data || []).map((t) => ({
      ...(t as Tag),
      name: (t.name || '').toUpperCase(),
      id: String(t.id),
      hot_score: (t as any).hot_score || 0,
      is_pinned: !!(t as any).is_pinned
    }));

    return result;
};
