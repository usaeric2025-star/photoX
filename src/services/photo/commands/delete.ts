import { supabase } from '@/lib/supabase';
import { Photo } from '@/types';
import { api } from '@/lib/api';

/**
 * Delete a single photo
 */
export const deletePhoto = async (photo: Photo): Promise<{ dissolvedGroupId?: string }> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Session required');

  const res = await api.photos.delete.$post({
    json: { id: photo.id, userId: session.user.id }
  });
  if (!res.ok) throw new Error('Delete failed');
  
  return { dissolvedGroupId: undefined };
};
