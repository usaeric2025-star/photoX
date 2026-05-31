import { supabase } from '@/lib/supabase';
import { DB_CONFIG } from '@/constants/config';
import { Photo } from '@/types';
import { mapSupabasePhoto } from './queries';
import { PHOTO_DETAIL_FIELDS } from '@/constants/photoFields';

export const loadPhotoById = async (photoId: string): Promise<Photo | null> => {
    if (!photoId) return null;

    const { data, error } = await supabase
        .from(DB_CONFIG.TABLE_NAME)
        .select(PHOTO_DETAIL_FIELDS)
        .eq('id', photoId)
        .maybeSingle();

    if (error) {
        throw {
            message: `Failed to load photo details: ${error.message}`,
            path: ['photos', 'loadPhotoById'],
            aiDebugHint: `Check PHOTO_DETAIL_FIELDS and RLS. Code: ${error.code}`
        };
    }

    return data ? mapSupabasePhoto(data) : null;
};
