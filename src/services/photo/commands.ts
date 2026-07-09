import { supabase } from '#lib/supabase.js';
import { DB_CONFIG } from '#src/constants/config.js';
import { Photo } from '#src/types/index.js';
import { mapToDb, mapSupabasePhoto } from '#src/services/mappers/index.js';
import { api } from '#lib/api.js';
import { uploadToR2 } from '#src/lib/upload/index.js';
import * as v from 'valibot';
import { PhotoSchema } from '#shared/apiContractSchema.js';
import { ErrorFactory } from '#src/lib/error/ErrorFactory.js';

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

    // Convert base64 to Blob if needed
    const response = await fetch(updates.uri);
    const blob = await response.blob();
    const imageUrl = await uploadToR2(blob, id);
    
    updates.imageUrl = imageUrl;
    updates.updatedAt = new Date().toISOString();
    delete updates.uri;
  }

  const dbUpdates = mapToDb(updates);
  const rawData = await ErrorFactory.unwrap<Record<string, unknown>>(
    api.photos.update.$post({
      json: { id, updates: dbUpdates }
    }),
    'Update photo failed'
  );
  
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

  const dbUpdates = mapToDb(updates);
  const updatedIds = await ErrorFactory.unwrap<string[]>(
    api.photos.batch.$post({
      json: { ids, updates: dbUpdates }
    }),
    'Batch update failed'
  );
  
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

  await ErrorFactory.unwrap<unknown>(
    api.admin.photos['delete-photos'].$post({ json: { ids } }),
    'Admin delete failed'
  );
  
  return { successCount: ids.length, failureCount: 0, failedItems: [] };
}
