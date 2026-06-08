import { supabase } from '../../../lib/supabase';
import { DB_CONFIG } from '../../../constants/config';
import { withErrorHandling } from '@/lib/error/wrapper';
import { AppResult, success } from '@/lib/error/ErrorFactory';
import { Photo } from '../../../types';

export const upsertPhotoRecord = async (payload: any): Promise<AppResult<any>> => {
    return withErrorHandling(async () => {
        const { data, error } = await supabase
            .from(DB_CONFIG.TABLE_NAME)
            .upsert(payload, { onConflict: 'id' })
            .select('id')
            .maybeSingle();
        
        if (error) throw error;
        return data;
    }, 'upsertPhotoRecord');
};

export const syncPhotoTagsInDB = async (photoId: string, tagIds: string[]): Promise<AppResult<void>> => {
    return withErrorHandling(async () => {
      await supabase.from('photo_tags').delete().eq('photo_id', photoId);
      if (tagIds.length > 0) {
        const associations = tagIds
            .filter(tid => !!tid)
            .map(tagId => ({
              photo_id: photoId,
              tag_id: tagId
            }));
        
        if (associations.length > 0) {
          const { error } = await supabase.from('photo_tags').insert(associations);
          if (error) throw error;
        }
      }
    }, 'syncPhotoTagsInDB');
};
