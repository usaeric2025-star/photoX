import { withErrorHandling } from '@/lib/error/wrapper';
import { ErrorFactory, success } from '@/lib/error/ErrorFactory';
import { AppResult } from '@/types/api';
import { Photo } from '@/types';
import { mapToDb } from '../mappers';
import { createPhotoValidator } from '@/lib/validators/factory';
import { api } from '@/lib/api';

export interface BatchActionResult {
  successCount: number;
  failureCount: number;
  failedItems: { id: string; reason: string }[];
}

export async function batchUpdate(ids: string[], initialUpdates: Partial<Photo>): Promise<AppResult<BatchActionResult>> {
  return withErrorHandling(async () => {
    if (!ids || ids.length === 0) return success({ successCount: 0, failureCount: 0, failedItems: [] });

    const updates = Object.keys(initialUpdates).reduce((acc: any, key) => {
      const val = initialUpdates[key as keyof typeof initialUpdates];
      if (val !== undefined) acc[key] = val;
      return acc;
    }, {} as Partial<Photo>);

    const validator = createPhotoValidator();
    const validationRes = validator.validate(updates);
    if (!validationRes.ok) return validationRes as AppResult<BatchActionResult>;

    const dbUpdates = mapToDb(updates);
    const res = await api.photos['batch-update'].$post({
      json: { ids, updates: dbUpdates }
    });
    
    if (!res.ok) throw ErrorFactory.wrap(new Error('Batch update failed'), 'mutations');
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

    const response = await api.admin['delete-photos'].$post({ json: { ids } });
    const result = await response.json();
    if (!response.ok || !result.success) throw ErrorFactory.wrap(new Error(result.error || 'Admin delete failed'), 'mutations');
    
    return success({ successCount: ids.length, failureCount: 0, failedItems: [] });
  }, 'deleteMany');
}
