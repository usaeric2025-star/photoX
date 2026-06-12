import { supabase } from '@/lib/supabase';
import { DB_CONFIG } from '@/constants/config';
import { Photo } from '@/types';
import { withErrorHandling } from '@/lib/error/wrapper';
import { ErrorFactory, success } from '@/lib/error/ErrorFactory';
import { AppResult } from '@/types/api';
import { mapToDb } from '../mappers';
import { createPhotoValidator } from '@/lib/validators/factory';
import { api } from '@/lib/api';

/**
 * Update a single photo
 */
export async function updatePhoto(id: string, initialUpdates: Partial<Photo>): Promise<AppResult<Photo | null>> {
  return withErrorHandling(async () => {
    if (!id || id.startsWith('temp-')) {
      throw ErrorFactory.wrap(new Error('无效的照片ID'), 'mutations');
    }

    const updates = Object.keys(initialUpdates).reduce((acc: any, key) => {
      const val = initialUpdates[key as keyof typeof initialUpdates];
      if (val !== undefined) acc[key] = val;
      return acc;
    }, {} as Partial<Photo>);

    const validator = createPhotoValidator();
    const validationRes = validator.validate(updates);
    if (!validationRes.ok) return validationRes as AppResult<Photo | null>;

    if (updates.uri && updates.uri.startsWith('data:image')) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw ErrorFactory.wrap(new Error('NO_ACTIVE_SESSION'), 'mutations');

      const { uploadWithRetry } = await import('@/services/storage');
      const uploadRes = await uploadWithRetry(session.user.id, id, updates.uri, undefined, undefined, undefined, 3, true);
      if (!uploadRes.ok) return uploadRes as any;
      
      updates.image_url = uploadRes.data.imageUrl;
      updates.updated_at = new Date().toISOString();
      delete updates.uri;
    }

    if (updates.is_group_cover === true) {
      const { data } = await supabase
        .from(DB_CONFIG.TABLE_NAME)
        .select('group_id')
        .eq('id', id)
        .maybeSingle();
      
      if (data?.group_id) {
        await supabase
          .from(DB_CONFIG.TABLE_NAME)
          .update({ is_group_cover: false })
          .eq('group_id', data.group_id);
      }
    }

    const dbUpdates = mapToDb(updates);
    const res = await api.photos.update.$post({
      json: { id, updates: dbUpdates }
    });
    
    if (!res.ok) throw ErrorFactory.wrap(new Error('Update failed'), 'mutations');
    return success(null);
  }, 'updatePhoto');
}

export const updatePhotoHidden = async (photoId: string, is_hidden: boolean): Promise<AppResult<null>> => {
    const res = await updatePhoto(photoId, { is_hidden, updated_at: new Date().toISOString() });
    return res as AppResult<null>;
};
