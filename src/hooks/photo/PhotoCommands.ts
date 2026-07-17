import { supabase } from '#lib/supabase.js';
import { Photo } from '#src/types/index.js';
import { mapToDb, mapSupabasePhoto } from '#src/utils/mappers/photo.js';
import { api } from '#lib/api.js';
import { uploadToR2 } from '#src/lib/upload/index.js';
import { ErrorFactory } from '#src/lib/error/ErrorFactory.js';
import { SupabasePhotoRaw } from '#src/types/supabase.js';

/**
 * Update a single photo
 */
export async function updatePhoto(id: string, initialUpdates: Partial<Photo>): Promise<Photo | null> {
  if (!id || id.startsWith('temp-')) {
    throw new Error('无效的照片ID');
  }

  const updates = { ...initialUpdates };

  if (updates.uri && updates.uri.startsWith('data:image')) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('NO_ACTIVE_SESSION');
    
    // Convert base64 to Blob
    const response = await fetch(updates.uri);
    const blob = await response.blob();
    const imageUrl = await uploadToR2(blob, id);
    
    updates.imageUrl = imageUrl;
    updates.updatedAt = new Date().toISOString();
    delete updates.uri;
  }

  const dbUpdates = mapToDb(updates);
  const rawData = await ErrorFactory.unwrap<SupabasePhotoRaw>(
    api.photos[':id'].$put({
      param: { id },
      json: { updates: dbUpdates }
    }),
    'Update photo failed'
  );
  
  return rawData ? mapSupabasePhoto(rawData) : null;
}

export type BatchActionResult = {
  successCount: number;
  failureCount: number;
  failedItems: { id: string; reason: string }[];
};

/**
 * Batch update photos
 */
export async function batchUpdatePhotos(ids: string[], initialUpdates: Partial<Photo>): Promise<BatchActionResult> {
  if (!ids || ids.length === 0) return { successCount: 0, failureCount: 0, failedItems: [] };
  
  const dbUpdates = mapToDb(initialUpdates);
  const updatedIds = await ErrorFactory.unwrap<string[]>(
    api.photos['batch-update'].$post({
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

/**
 * Batch delete photos
 */
export async function deleteManyPhotos(ids: string[]): Promise<BatchActionResult> {
  if (!ids || ids.length === 0) return { successCount: 0, failureCount: 0, failedItems: [] };
  
  await ErrorFactory.unwrap<unknown>(
    api.photos['batch-delete'].$post({ json: { ids } }),
    'Delete photos failed'
  );

  return { 
    successCount: ids.length, 
    failureCount: 0, 
    failedItems: [] 
  };
}
