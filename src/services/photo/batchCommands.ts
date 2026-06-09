import { supabase } from '../../lib/supabase';
import { DB_CONFIG } from '../../constants/config';
import { Photo } from '../../types';
import { withErrorHandling } from '@/lib/error/wrapper';
import { withSupabase } from '@/lib/error/supabaseWrapper';
import { success } from '@/lib/error/ErrorFactory';
import { AppResult } from '@/types/api';
import { createPhotoValidator } from '../../lib/validators/factory';
import { mapToDb } from './toDb';
import { syncBatchPhotoTags } from '@/services/tag/commands';

export interface BatchActionResult {
  successCount: number;
  failureCount: number;
  failedItems: { id: string; reason: string }[];
}

export async function batchUpdate(ids: string[], updates: Partial<Photo>): Promise<AppResult<BatchActionResult>> {
  return withErrorHandling(async () => {
    if (!ids || ids.length === 0) return success({ successCount: 0, failureCount: 0, failedItems: [] });

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

    return success({
      successCount: updatedIds.size,
      failureCount: failedOnes.length,
      failedItems: failedOnes
    });
  }, 'batchUpdate');
}

export async function deleteMany(ids: string[]): Promise<AppResult<BatchActionResult>> {
  return withErrorHandling(async () => {
    if (!ids || ids.length === 0) return success({ successCount: 0, failureCount: 0, failedItems: [] });

    const { api } = await import('@/lib/api');
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
