import { supabase } from '@/lib/supabase';
import { withErrorHandling } from '@/lib/error/wrapper';
import { ErrorFactory, success } from '@/lib/error/ErrorFactory';
import { AppResult } from '@/types/api';
import { Photo } from '@/types';
import { api } from '@/lib/api';

/**
 * Delete a single photo
 */
export const deletePhoto = async (photo: Photo): Promise<AppResult<{ dissolvedGroupId?: string }>> => {
  return withErrorHandling(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw ErrorFactory.wrap(new Error('Session required'), 'mutations');

    const res = await api.photos.delete.$post({
      json: { id: photo.id, userId: session.user.id }
    });
    if (!res.ok) throw ErrorFactory.wrap(new Error('Delete failed'), 'mutations');
    
    return success({ dissolvedGroupId: undefined });
  }, 'deletePhoto');
};
