import { supabase } from '@/lib/supabase';
import { DB_CONFIG } from '@/constants/config';
import { Photo } from '@/types';
import { mapToDb, mapSupabasePhoto } from '../mappers';
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

  if (updates.uri && updates.uri.startsWith('data:image')) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('NO_ACTIVE_SESSION');

    const { uploadWithRetry } = await import('@/services/storage');
    const uploadRes = await uploadWithRetry(session.user.id, id, updates.uri, undefined, undefined, undefined, 3, true);
    
    updates.image_url = uploadRes.imageUrl;
    updates.updated_at = new Date().toISOString();
    delete updates.uri;
  }

  const dbUpdates = mapToDb(updates);
  const res = await api.photos.update.$post({
    json: { id, updates: dbUpdates }
  });
  
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({})) as any;
    throw new Error(errBody?.error || 'Update failed');
  }
  const body = await res.json() as { data?: Record<string, unknown> };
  const rawData = body.data;
  return rawData ? mapSupabasePhoto(rawData as unknown as Record<string, unknown> & { id: string, name: string, image_url: string, created_at: string }) : null;
}

export const updatePhotoHidden = async (photoId: string, is_hidden: boolean): Promise<Photo | null> => {
  return await updatePhoto(photoId, { is_hidden, updated_at: new Date().toISOString() });
};
