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
    
    const result = (data || []).map((t: any) => ({
      ...t,
      name: (t.name || '').toUpperCase(),
      id: String(t.id),
      hot_score: t.hot_score || 0
    }));

    return result;
};
