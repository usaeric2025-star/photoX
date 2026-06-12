import { ErrorFactory, success } from '@/lib/error/ErrorFactory';
import { withSupabase } from '@/lib/error/supabaseWrapper';
import { Photo } from '@/types';
import { supabase } from '@/lib/supabase';
import { DB_CONFIG } from '@/constants/config';
import { PHOTO_DETAIL_FIELDS } from '@/constants/photoFields';
import { loadTagsFromCloud } from '../../tag';
import { mapSupabasePhoto } from '../mappers';
import { AppResult } from '@/types/api';

/**
 * Loads simple photo details by ID
 */
export const getPhotoById = async (photoId: string): Promise<AppResult<Photo | null>> => {
    if (!photoId) return success(null);
    const query = supabase
        .from(DB_CONFIG.TABLE_NAME)
        .select(PHOTO_DETAIL_FIELDS)
        .eq('id', photoId)
        .maybeSingle();

    const [res, allTags] = await Promise.all([
      withSupabase(query, 'loadPhotoById'),
      loadTagsFromCloud().catch(() => [])
    ]);

    if (!res.ok) return res;
    return success(res.data ? mapSupabasePhoto(res.data, allTags) : null);
};
