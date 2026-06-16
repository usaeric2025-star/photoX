import { supabase } from '@/lib/supabase';
import { DB_CONFIG } from '@/constants/config';
import { Photo } from '@/types';
import { mapToDb } from '../mappers';
import { createPhotoValidator } from '@/lib/validators/factory';
import { api } from '@/lib/api';

/**
 * Update a single photo
 */
export async function updatePhoto(id: string, initialUpdates: Partial<Photo>): Promise<Photo | null> {
  if (!id || id.startsWith('temp-')) {
    throw new Error('无效的照片ID');
  }

  const updates = Object.keys(initialUpdates).reduce((acc: Record<string, unknown>, key) => {
    const val = initialUpdates[key as keyof typeof initialUpdates];
    if (val !== undefined) acc[key] = val;
    return acc;
  }, {} as Record<string, unknown>) as Partial<Photo>;

  createPhotoValidator().validate(updates);

  if (updates.uri && updates.uri.startsWith('data:image')) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('NO_ACTIVE_SESSION');

    const { uploadWithRetry } = await import('@/services/storage');
    const uploadRes = await uploadWithRetry(session.user.id, id, updates.uri, undefined, undefined, undefined, 3, true);
    
    updates.image_url = uploadRes.imageUrl;
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
  
  if (!res.ok) throw new Error('Update failed');
  const { data } = await res.json();
  return data;
}

export const updatePhotoHidden = async (photoId: string, is_hidden: boolean): Promise<Photo | null> => {
  return await updatePhoto(photoId, { is_hidden, updated_at: new Date().toISOString() });
};
