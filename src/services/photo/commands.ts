import { supabase } from '../../lib/supabase';
import { DB_CONFIG } from '../../constants/config';
import { Photo } from '../../types';
import { ungroupPhotos, syncGroupMemberCount } from '@/services/photo/groupUtils';
import { syncBatchPhotoTags } from '@/services/tag/commands';
import { withErrorHandling } from '@/lib/error/wrapper';
import { withSupabase } from '@/lib/error/supabaseWrapper';
import { ok, err, isErr, ErrorFactory, success, errorFactory, fromThrowableAsync } from '@/lib/error/ErrorFactory';
import type { Result, AppResult } from '@/types/api';
import { PAGINATION } from '../../config/constants';
import { safeArray } from '../../lib/utils';
import { mapToDb } from './photoMappingUtils';
import { generateItemCode } from './utils';
import { createPhotoValidator } from '../../lib/validators/factory';
import { api } from '@/lib/api';

/**
 * Consolidating all photo mutation logic here from photoMutationService and photoActions.
 */

export interface BatchActionResult {
  successCount: number;
  failureCount: number;
  failedItems: { id: string; reason: string }[];
}

// --- Core Update Command ---
export async function updatePhoto(id: string, updates: Partial<Photo>): Promise<AppResult<Photo | null>> {
  return withErrorHandling(async () => {
    if (!id || id.startsWith('temp-')) {
      throw new Error('无效的照片ID');
    }

    // 1. Validation
    const validator = createPhotoValidator();
    const validationRes = validator.validate(updates);
    if (!validationRes.ok) return validationRes as AppResult<Photo | null>;

    // 2. Handle image data URI if present (e.g. from rotation)
    if (updates.uri && updates.uri.startsWith('data:image')) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('NO_ACTIVE_SESSION');

      const { uploadWithRetry } = await import('../storage');
      const uploadRes = await uploadWithRetry(session.user.id, id, updates.uri, undefined, undefined, undefined, 3, true);
      if (!uploadRes.ok) return uploadRes as any;
      
      updates.image_url = uploadRes.data.imageUrl;
      updates.updated_at = new Date().toISOString();
      delete updates.uri;
    }

    // 3. Special handling for group cover
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

    // 4. Update Database via admin backend route
    const response = await api.admin.photo.update.$post({
      json: { id, updates: dbUpdates as any }
    });
    
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Update failed');
    }

    if ('tags' in updates && Array.isArray(updates.tags)) {
      await syncBatchPhotoTags([id], updates.tags.map(t => String(t.id)));
    }

    return success(null);
  }, 'updatePhoto');
}

// Alias for legacy support
export const update = updatePhoto;

// --- Batch Update ---
export async function batchUpdate(ids: string[], updates: Partial<Photo>): Promise<AppResult<BatchActionResult>> {
  return withErrorHandling(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Session required');

    const validator = createPhotoValidator();
    const validationRes = validator.validate(updates);
    if (!validationRes.ok) return validationRes as AppResult<BatchActionResult>;

    const dbUpdates = mapToDb(updates);
    
    const query = supabase
      .from(DB_CONFIG.TABLE_NAME)
      .update(dbUpdates)
      .in('id', ids)
      .select('id');

    const res = await withSupabase(query, 'batchUpdate');
    
    if (!res.ok) {
      // Fallback
      const failedItems: { id: string; reason: string }[] = [];
      let successCount = 0;

      for (const id of ids) {
        const { error } = await supabase.from(DB_CONFIG.TABLE_NAME).update(dbUpdates).eq('id', id);
        if (error) failedItems.push({ id, reason: error.message });
        else successCount++;
      }
      return success({ successCount, failureCount: failedItems.length, failedItems });
    }

    const updatedIds = new Set(res.data?.map(d => d.id) || []);
    const failedOnes = ids.filter(id => !updatedIds.has(id)).map(id => ({ id, reason: 'Not found or unchanged' }));

    if ('tags' in updates && Array.isArray(updates.tags)) {
      await syncBatchPhotoTags(ids, updates.tags.map(t => String(t.id)));
    }

    return success({
      successCount: updatedIds.size,
      failureCount: failedOnes.length,
      failedItems: failedOnes
    });
  }, 'batchUpdate');
}

// --- Delete ---
export async function deleteMany(ids: string[]): Promise<AppResult<BatchActionResult>> {
  return withErrorHandling(async () => {
    try {
      const response = await api.admin['delete-photos'].$post({ json: { ids } });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Admin delete failed');
      
      return success({ successCount: ids.length, failureCount: 0, failedItems: [] });
    } catch(err: any) {
      const query = supabase.from(DB_CONFIG.TABLE_NAME).delete().in('id', ids).select('id');
      const res = await withSupabase(query, 'deleteMany/fallback');
      if (!res.ok) return res as any;

      const deletedIds = new Set(res.data?.map(d => d.id) || []);
      const failed = ids.filter(id => !deletedIds.has(id)).map(id => ({ id, reason: 'Permission Denied or Not Found' }));

      return success({ successCount: deletedIds.size, failureCount: failed.length, failedItems: failed });
    }
  }, 'deleteMany');
}

export const deletePhoto = async (photo: Photo): Promise<AppResult<{ dissolvedGroupId?: string }>> => {
  return withErrorHandling(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Session required');

    const query = supabase
      .from(DB_CONFIG.TABLE_NAME)
      .delete()
      .match({ id: photo.id, user_id: session.user.id });

    const res = await withSupabase(query, 'deletePhoto');
    if (!res.ok) return res as any;

    // Physical Cleanup logic remains (only if needed)
    if (photo.image_url) {
       const { count } = await supabase.from(DB_CONFIG.TABLE_NAME).select('id', { count: 'exact', head: true }).eq('image_url', photo.image_url);
       if (count === 0) {
          const { cleanupPhysicalStorage } = await import('../storage');
          await cleanupPhysicalStorage([photo.storage_id || photo.id], [photo.image_url]);
       }
    }
    
    let dissolvedGroupId: string | undefined;
    if (photo.group_id) {
      const { data: remaining } = await supabase.from(DB_CONFIG.TABLE_NAME).select('id').eq('group_id', photo.group_id);
      if (remaining && remaining.length <= 1) {
        await ungroupPhotos(photo.group_id);
        dissolvedGroupId = photo.group_id;
      } else {
        await syncGroupMemberCount(photo.group_id);
      }
    }

    return success({ dissolvedGroupId });
  }, 'deletePhoto');
};


export const updatePhotoHidden = async (photoId: string, is_hidden: boolean): Promise<AppResult<null>> => {
  const res = await updatePhoto(photoId, { is_hidden, updated_at: new Date().toISOString() });
  return res as AppResult<null>;
};

export const updatePhotoHiddenState = updatePhotoHidden;
