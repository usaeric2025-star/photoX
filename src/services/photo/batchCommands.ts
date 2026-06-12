import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { supabase } from '../../lib/supabase';
import { DB_CONFIG } from '../../constants/config';
import { Photo } from '../../types';
import { withErrorHandling } from '@/lib/error/wrapper';
import { withSupabase } from '@/lib/error/supabaseWrapper';
import { success } from '@/lib/error/ErrorFactory';
import { AppResult } from '@/types/api';
import { createPhotoValidator } from '../../lib/validators/factory';
import { api } from '@/lib/api';
import { mapToDb } from './toDb';

export interface BatchActionResult {
  successCount: number;
  failureCount: number;
  failedItems: { id: string; reason: string }[];
}

export async function batchUpdate(ids: string[], initialUpdates: Partial<Photo>): Promise<AppResult<BatchActionResult>> {
  return withErrorHandling(async () => {
    if (!ids || ids.length === 0) return success({ successCount: 0, failureCount: 0, failedItems: [] });

    // sanitize updates to remove explicit undefined fields
    const updates = Object.keys(initialUpdates).reduce((acc: any, key) => {
      const val = initialUpdates[key as keyof typeof initialUpdates];
      if (val !== undefined) acc[key] = val;
      return acc;
    }, {} as Partial<Photo>);

    const { createPhotoValidator } = await import('../../lib/validators/factory');
    const validator = createPhotoValidator();
    const validationRes = validator.validate(updates);
    if (!validationRes.ok) return validationRes as AppResult<BatchActionResult>;

    const { mapToDb } = await import('./toDb');
    const dbUpdates = mapToDb(updates);
    
    const res = await api.photos['batch-update'].$post({
      json: { ids, updates: dbUpdates }
    });
    
    if (!res.ok) throw ErrorFactory.wrap(new Error('Batch update failed'), 'batchCommands');
    const { data: updatedIds } = await res.json();
    
    const updatedIdSet = new Set(updatedIds || []);
    const failedOnes = ids.filter(id => !updatedIdSet.has(id)).map(id => ({ id, reason: 'Not found or unchanged' }));

    return success({
      successCount: updatedIdSet.size,
      failureCount: failedOnes.length,
      failedItems: failedOnes
    });
  }, 'batchUpdate');
}

export async function deleteMany(ids: string[]): Promise<AppResult<BatchActionResult>> {
  return withErrorHandling(async () => {
    if (!ids || ids.length === 0) return success({ successCount: 0, failureCount: 0, failedItems: [] });

    const { api } = await import('@/lib/api');
    const response = await api.admin['delete-photos'].$post({ json: { ids } });
    const result = await response.json();
    if (!response.ok || !result.success) throw ErrorFactory.wrap(new Error(result.error || 'Admin delete failed'), 'batchCommands');
    
    return success({ successCount: ids.length, failureCount: 0, failedItems: [] });
  }, 'deleteMany');
}
