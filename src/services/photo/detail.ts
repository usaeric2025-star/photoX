import { supabase } from '@/lib/supabase';
import { DB_CONFIG } from '@/constants/config';
import { Photo } from '@/types';
import { mapSupabasePhoto } from './mapping';
import { PHOTO_DETAIL_FIELDS } from '@/constants/photoFields';
import { withSupabase } from '@/lib/error/supabaseWrapper';
import { success } from '@/lib/error/ErrorFactory';
import { AppResult } from '@/types/api';

export const loadPhotoById = async (photoId: string): Promise<AppResult<Photo | null>> => {
    if (!photoId) return success(null);

    const query = supabase
        .from(DB_CONFIG.TABLE_NAME)
        .select(PHOTO_DETAIL_FIELDS)
        .eq('id', photoId)
        .maybeSingle();

    return withSupabase(query, 'loadPhotoById').then(res => {
      if (!res.ok) return res;
      return success(res.data ? mapSupabasePhoto(res.data) : null);
    });
};
