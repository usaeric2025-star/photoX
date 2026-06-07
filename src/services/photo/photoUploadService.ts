import { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { DB_CONFIG, PAGINATION } from '../../constants/config';
import { Photo } from '../../types';
import { uploadWithRetry } from '../storage';
import { safeArray } from '../../lib/utils';
import { mapToDb, normalizeDimensionsBeforeSave } from './photoMappingUtils';
import { checkDuplicate, DuplicatePhotoError } from '@/lib/data/duplicateCheck';
import { generateItemCode } from './utils';
import { StandardError } from '@/lib/validators/protocol';
import { extractErrorMessage } from '@/lib/error/errorHandler';

export const savePhotoToCloud = async (userId: string, photo: Photo, onStatus?: (s: string) => void): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();
  const isLocalStorageStaff = typeof window !== 'undefined' && !!window.localStorage.getItem('ais_mock_auth_passcode');

  if (!session?.user && !isLocalStorageStaff) {
    throw new StandardError('鉴权失败: 无活跃会话', { aiDebugHint: '[savePhotoToCloud] userId extraction failed' });
  }

  const actUserId = session?.user?.id || userId || 'staff';
  
  if (!actUserId) {
    throw new StandardError('Critical: Missing user_id for photo operation', { aiDebugHint: '[uploadPhotosBatch] actUserId is missing' });
  }

  // Pre-insert duplicate check & Meta-Reservation to prevent orphans
  if (photo.image_hash) {
      const dbCheck = await checkDuplicate(
        actUserId, 
        photo.image_hash, 
        (photo as any)._fileSize, 
        (photo as any)._fileName, 
        (photo as any)._lastModified,
        photo.id
      );
      if (dbCheck.isDuplicate) {
         throw new DuplicatePhotoError();
      }
      
      if (dbCheck.orphanId) {
        photo.id = dbCheck.orphanId; // Recover the original ID and overwrite it
      }
      
      // Safety Pre-Upsert: Reserve the entry in DB before uploading to R2
      // This ensures that even if upload fails, we have the shell of the record
      const safetyPayload = mapToDb({
        ...photo,
        user_id: actUserId,
        image_url: photo.image_url ?? undefined, // Fix null vs undefined
      }, true);
      
      await supabase.from(DB_CONFIG.TABLE_NAME).upsert(safetyPayload, { onConflict: 'id' });
  }

  // Upload image if it doesn't have an image_url yet but has a uri
  if (!photo.image_url && photo.uri) {
    try {
      const filename = photo.storage_id || photo.id;
      const { imageUrl, isDuplicate } = await uploadWithRetry(userId, filename, photo.uri, photo.image_hash, onStatus);
      if (isDuplicate) {
        throw new DuplicatePhotoError();
      }
      photo.image_url = imageUrl;
    } catch (e) {
      const message = extractErrorMessage(e);
      throw new StandardError(message, { 
        originalError: e,
        aiDebugHint: `[savePhotoToCloud] 底層異常: ${message}` 
      });
    }
  }

  // const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(photo.id);
  
  normalizeDimensionsBeforeSave(photo.dimensions);

  // Explicitly assign a valid UUID if it is missing or starts with temp-
  if (!photo.id || photo.id.startsWith('temp-')) {
      const newId = crypto.randomUUID();
      photo.id = newId;
  }
  
  const payload: Record<string, unknown> = mapToDb({
    ...photo,
    user_id: actUserId,
  }, true); // Always map to DB as if new
  
  if (!payload.id) {
     payload.id = photo.id;
  }

  let { data: savedPhoto, error: dbError } = await supabase
    .from(DB_CONFIG.TABLE_NAME)
    .upsert(payload, { onConflict: 'id' })
    .select('id')
    .maybeSingle();

  if (dbError && dbError.message.includes('furniture_items_item_code_key')) {
     console.warn("Item code constraint violation detected in savePhotoToCloud, regenerating code and retrying save...");
     payload.item_code = generateItemCode();
     photo.item_code = payload.item_code as string;
     const retryResult = await supabase
        .from(DB_CONFIG.TABLE_NAME)
        .upsert(payload, { onConflict: 'id' })
        .select('id')
        .maybeSingle();
     savedPhoto = retryResult.data;
     dbError = retryResult.error;
  }

  if (dbError) {
    if (photo.image_url) {
      const { cleanupPhysicalStorage } = await import('../storage/deleteService');
      cleanupPhysicalStorage([photo.storage_id || photo.id], [photo.image_url]).catch(() => {});
    }
    throw new StandardError(dbError.message, { 
      originalError: dbError,
      aiDebugHint: `[savePhotoToCloud/upsert] 底層異常: ${dbError.message}` 
    });
  }

  const finalPhotoId = savedPhoto?.id || photo.id;

  if (photo.id !== finalPhotoId) {
    photo.id = finalPhotoId;
  }

  const sTagIds = safeArray(photo.tag_ids);
  if (sTagIds.length >= 0) {
    await supabase.from('photo_tags').delete().eq('photo_id', finalPhotoId);
    
    if (sTagIds.length > 0) {
      const tagAssociations = sTagIds
        .filter(tid => !!tid)
        .map(tagId => ({
          photo_id: finalPhotoId,
          tag_id: tagId
        }));
      
      if (tagAssociations.length > 0) {
        const { error: tagError } = await supabase.from('photo_tags').insert(tagAssociations);
        if (tagError) console.warn("Failed to sync photo tags:", tagError);
      }
    }
  }

  return finalPhotoId;
};

export const savePhotosToCloudBatch = async (
  userId: string, 
  photos: Photo[],
  onProgress?: (count: number) => void
): Promise<Photo[]> => {
  let sPhotos = safeArray<Photo>(photos);
  if (sPhotos.length === 0) return [];

  const { data: { session } } = await supabase.auth.getSession();
  const isLocalStorageStaff = typeof window !== 'undefined' && !!window.localStorage.getItem('ais_mock_auth_passcode');
  if (!session?.user && !isLocalStorageStaff) {
    throw new StandardError('No active session for database', { aiDebugHint: '[uploadPhotosBatch] userId extraction failed' });
  }

  const actUserId = session?.user?.id || userId || 'staff';

  if (!actUserId) {
    throw new StandardError('Critical: Missing user_id for photo operation', { aiDebugHint: '[uploadPhotosBatch] actUserId is missing' });
  }

  // Pre-filter duplicates
  const uniquePhotos: Photo[] = [];
  for (const photo of sPhotos as Photo[]) {
    if (photo.image_hash) {
       const dbCheck = await checkDuplicate(
         actUserId, 
         photo.image_hash, 
         (photo as any)._fileSize, 
         (photo as any)._fileName, 
         (photo as any)._lastModified,
         photo.id
       );
      if (dbCheck.isDuplicate) {
        continue;
      }
      if (dbCheck.orphanId) {
        photo.id = dbCheck.orphanId;
      }
    }
    uniquePhotos.push(photo);
  }

  sPhotos = uniquePhotos;
  if (sPhotos.length === 0) return [];

  // Replace temp- IDs with proper UUIDs to ensure group consistency
  const idMap = new Map<string, string>();
  sPhotos.forEach(p => {
    if (!p.id || p.id.startsWith('temp-')) {
      const newId = crypto.randomUUID();
      if (p.id) idMap.set(p.id, newId);
      p.id = newId;
    }
  });

  // Update group_id references using the idMap
  sPhotos.forEach(p => {
    if (p.group_id && idMap.has(p.group_id)) {
      p.group_id = idMap.get(p.group_id)!;
    }
  });

  // Step 1: Meta-Reservation (Batch) to secure IDs and Item Codes
  // This helps prevent orphans by ensuring DB knows about these files before they hit R2
  const reservationPayloads = sPhotos.map(photo => {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(photo.id || '');
    const dbData = mapToDb({ ...photo, user_id: actUserId }, true);
    const payload: any = {
      ...dbData,
      updated_at: new Date().toISOString()
    };
    if (isUUID) payload.id = photo.id;
    return payload;
  });

  const chunkSize = PAGINATION.CHUNK_SIZE;
  for (let i = 0; i < reservationPayloads.length; i += chunkSize) {
    const chunk = reservationPayloads.slice(i, i + chunkSize);
    await supabase.from(DB_CONFIG.TABLE_NAME).upsert(chunk, { onConflict: 'id' });
  }

  // Step 2: Upload images in parallel with concurrency control
  const CONCURRENCY_LIMIT = 5; 
  const uploadQueue = [...sPhotos];
  const totalToUpload = uploadQueue.length;
  let completedCount = 0;
  const uploadTasks: Promise<void>[] = [];

  for (let i = 0; i < Math.min(CONCURRENCY_LIMIT, uploadQueue.length); i++) {
    const worker = async () => {
      while (uploadQueue.length > 0) {
        const photo = uploadQueue.shift();
        if (!photo) break;
        
        if (!photo.image_url && photo.uri) {
          try {
            const filename = photo.storage_id || photo.id;
            const { imageUrl } = await uploadWithRetry(userId, filename, photo.uri, photo.image_hash);
            photo.image_url = imageUrl;
            
            // Incremental Update: Sync the URL back to DB as soon as EACH photo finishes
            await supabase
              .from(DB_CONFIG.TABLE_NAME)
              .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
              .eq('id', photo.id);
            
            completedCount++;
            if (onProgress) onProgress(completedCount);
          } catch (e) {
            console.error(`[uploadPhotosBatch] Failed to upload ${photo.id}:`, e);
            // Even on failure, we increment progress so the UI doesn't hang
            completedCount++;
            if (onProgress) onProgress(completedCount);
          }
        } else {
          // Already has URL or no URI
          completedCount++;
          if (onProgress) onProgress(completedCount);
        }
      }
    };
    uploadTasks.push(worker());
  }

  await Promise.all(uploadTasks);

  const results: Photo[] = [...sPhotos.map(p => ({ ...p }))];
  const payloads = sPhotos.map(photo => {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(photo.id);
    
    normalizeDimensionsBeforeSave(photo.dimensions);

    const payload: Record<string, unknown> = {
      user_id: actUserId, // Explicit enforcement
      item_code: photo.item_code || generateItemCode(),
      manual_code: photo.manual_code || '',
      image_hash: photo.image_hash,
      name: photo.name,
      category_id: photo.category_id || null,
      manufacturer_id: photo.manufacturer_id || null,
      description: photo.description || { zh: '' },
      image_url: photo.image_url,
      dimensions: photo.dimensions || null,
      model_number: photo.model_number || '',
      created_at: photo.created_at,
      group_id: photo.group_id || null,
      is_group_cover: photo.is_group_cover || false,
      is_hidden: photo.is_hidden || false,
      updated_at: photo.updated_at || new Date().toISOString()
    };
    if (isUUID) {
      payload.id = photo.id;
    }
    return payload;
  });

  // Re-finalize with any updated metadata in chunk-wise upserts
  for (let i = 0; i < payloads.length; i += chunkSize) {
    const chunk = payloads.slice(i, i + chunkSize);
    let savedRows: { id: string; image_hash: string }[] | null = null;
    let dbError: PostgrestError | null = null;

    let AttemptChunk = chunk.map(p => ({ ...p }));
    for (let attempt = 1; attempt <= 4; attempt++) {
      const { data, error } = await supabase
        .from(DB_CONFIG.TABLE_NAME)
        .upsert(AttemptChunk, { onConflict: 'id', ignoreDuplicates: false })
        .select('id, image_hash');

      if (!error) {
        savedRows = data;
        dbError = null;
        AttemptChunk.forEach((p, idx) => {
          chunk[idx].item_code = p.item_code;
          const indexInResults = i + idx;
          if (results[indexInResults]) {
            results[indexInResults].item_code = p.item_code as string;
          }
        });
        break;
      }

      dbError = error;

      if (error.message.includes('furniture_items_item_code_key')) {
        console.warn(`[savePhotosToCloudBatch] Attempt ${attempt}: Encountered item_code collision, regenerating and retrying...`);
        AttemptChunk = AttemptChunk.map(p => ({
          ...p,
          item_code: generateItemCode()
        }));
        continue;
      }

      if (error.message.includes('column')) {
        console.warn(`[savePhotosToCloudBatch] Attempt ${attempt}: DB Schema mismatch, removing group columns and retrying...`);
        AttemptChunk = AttemptChunk.map(p => {
          const cp = { ...p };
          delete cp.group_id;
          delete cp.is_group_cover;
          return cp;
        });
        continue;
      }

      break;
    }

    if (dbError) {
      throw new StandardError(dbError.message, { 
        originalError: dbError,
        aiDebugHint: `[uploadPhotosBatch/upsert] 底層異常: ${dbError.message}` 
      });
    }
    
    if (savedRows) {
      const usedIndexes = new Set<number>();
      savedRows.forEach((row) => {
        const photoIndex = results.findIndex((p, idx) => 
          p.image_hash === row.image_hash && !usedIndexes.has(idx)
        );
        if (photoIndex !== -1) {
          results[photoIndex].id = row.id;
          usedIndexes.add(photoIndex);
        }
      });
    }
    
    if (onProgress) onProgress(Math.min(i + chunkSize, payloads.length));
  }

  const photoIdsToUpdate = safeArray<Photo>(results).map(p => p.id);
  
  for (let i = 0; i < photoIdsToUpdate.length; i += 100) {
     const chunkIds = photoIdsToUpdate.slice(i, i + 100);
     await supabase.from('photo_tags').delete().in('photo_id', chunkIds);
  }

  const newTagAssociations: { photo_id: string; tag_id: string }[] = [];
  safeArray<Photo>(results).forEach(p => {
    const pTagIds = safeArray<string>(p.tag_ids);
    if (pTagIds.length > 0) {
      pTagIds.forEach(tid => {
        if (tid) newTagAssociations.push({ photo_id: p.id, tag_id: tid });
      });
    }
  });

  for (let i = 0; i < newTagAssociations.length; i += 200) {
    const chunk = newTagAssociations.slice(i, i + 200);
    const { error: tagError } = await supabase.from('photo_tags').insert(chunk);
    if (tagError) console.warn("Failed to bulk sync photo tags:", tagError);
  }

  return results;
};
