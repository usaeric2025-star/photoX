import { Photo } from '@/types';
import { supabase } from '@/lib/supabase';
import { DB_CONFIG } from '@/constants/config';
import { PHOTO_DETAIL_FIELDS } from '@/constants/photoFields';
import { loadTagsFromCloud } from '../../tag';
import { mapSupabasePhoto } from '../mappers';

/**
 * Loads simple photo details by ID
 */
export const getPhotoById = async (photoId: string): Promise<Photo | null> => {
    if (!photoId) return null;
    const { data, error } = await supabase
        .from(DB_CONFIG.TABLE_NAME)
        .select(PHOTO_DETAIL_FIELDS)
        .eq('id', photoId)
        .maybeSingle();

    if (error) throw error;
    
    const allTags = await loadTagsFromCloud().catch(() => []);
    return data ? mapSupabasePhoto(data, allTags) : null;
};
