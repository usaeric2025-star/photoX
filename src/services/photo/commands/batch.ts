import { Photo } from '@/types';
import { mapToDb } from '../mappers';
import { createPhotoValidator } from '@/lib/validators/factory';
import { api } from '@/lib/api';

export type BatchActionResult = {
  successCount: number;
  failureCount: number;
  failedItems: { id: string; reason: string }[];
} & Record<string, unknown>;

export async function batchUpdate(ids: string[], initialUpdates: Partial<Photo>): Promise<BatchActionResult> {
  if (!ids || ids.length === 0) return { successCount: 0, failureCount: 0, failedItems: [] };

  const updates = Object.keys(initialUpdates).reduce((acc: Record<string, unknown>, key) => {
    const val = initialUpdates[key as keyof typeof initialUpdates];
    if (val !== undefined) acc[key] = val;
    return acc;
  }, {} as Record<string, unknown>) as Partial<Photo>;

  createPhotoValidator().validate(updates);

  const dbUpdates = mapToDb(updates);
  const res = await api.photos['batch-update'].$post({
    json: { ids, updates: dbUpdates }
  });
  
  if (!res.ok) throw new Error('Batch update failed');
  const { data: updatedIds } = await res.json();
  
  const updatedIdSet = new Set(updatedIds || []);
  const failedOnes = ids.filter(id => !updatedIdSet.has(id)).map(id => ({ id, reason: 'Not found or unchanged' }));

  return {
    successCount: updatedIdSet.size,
    failureCount: failedOnes.length,
    failedItems: failedOnes
  };
}

export async function deleteMany(ids: string[]): Promise<BatchActionResult> {
  if (!ids || ids.length === 0) return { successCount: 0, failureCount: 0, failedItems: [] };

  const response = await api.admin['delete-photos'].$post({ json: { ids } });
  const result = await response.json() as { success: boolean, error?: string };
  if (!response.ok || !result.success) throw new Error(result.error || 'Admin delete failed');
  
  return { successCount: ids.length, failureCount: 0, failedItems: [] };
}
