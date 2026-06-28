import { supabase } from '@/lib/supabase';
import { DB_CONFIG } from '@/constants/config';
import { Photo } from '@/types';
import { mapToDb, mapSupabasePhoto } from '@/services/mappers';
import { api } from '@/lib/api';
import { uploadWithRetry } from '@/services/storage';
import * as v from 'valibot';
import { PhotoSchema } from '@shared/apiContractSchema';

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
    const errBody = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(errBody?.error || 'Update failed');
  }
  const body = await res.json() as { data?: Record<string, unknown> };
  const rawData = body.data;
  return rawData ? mapSupabasePhoto(rawData as unknown as Record<string, unknown> & { id: string, name: string, image_url: string, created_at: string }) : null;
}

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

  // Validate updates using the shared contract (partial since it's a batch update)
  v.parse(v.partial(PhotoSchema), updates);

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
