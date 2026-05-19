import { supabase } from '../../lib/supabase';
import { DB_CONFIG, PAGINATION } from '../../constants/config';
import { Photo } from '../../types';
import { uploadImages } from '../storageService';
import { photoCache } from '../photoService';
import { safeArray } from '../../lib/utils';
import { mapToDb, normalizeDimensionsBeforeSave } from './photoMappingUtils';
import { checkDuplicate, DuplicatePhotoError } from '../../utils/duplicateCheck';

export const savePhotoToCloud = async (userId: string, photo: Photo, onStatus?: (s: string) => void): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error('鉴权失败: 无活跃会话');
  }

  // Pre-insert duplicate check
  if (photo.image_hash) {
     const isDuplicate = await checkDuplicate(
       session.user.id, 
       photo.image_hash, 
       (photo as any)._fileSize, 
       (photo as any)._fileName, 
       (photo as any)._lastModified,
       photo.id
     );
     if (isDuplicate) {
        throw new DuplicatePhotoError();
     }
  }

  // Upload image if it doesn't have an image_url yet but has a uri
  if (!photo.image_url && photo.uri) {
    try {
      const filename = photo.storageId || photo.id;
      const { imageUrl, thumbUrl } = await uploadImages(userId, filename, photo.uri, onStatus);
      photo.image_url = imageUrl;
      photo.thumb_url = thumbUrl;
    } catch (e) {
      console.error("Failed to upload image:", e);
      throw new Error(`存储上传失败: ${e instanceof Error ? e.message : '未知原因'}`);
    }
  }

  // const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(photo.id);
  
  normalizeDimensionsBeforeSave(photo.dimensions);

  const payload: Record<string, unknown> = mapToDb({
    ...photo,
    userId: session.user.id,
  }, true); // Always map to DB as if new

  // Explicitly remove id from payload to let DB generate UUID IF it is temporary or missing
  if (!photo.id || photo.id.startsWith('temp-')) {
      delete payload.id;
  } else {
      payload.id = photo.id;
  }

  let { data: savedPhoto, error: dbError } = await supabase
    .from(DB_CONFIG.TABLE_NAME)
    .upsert(payload, { onConflict: 'id' }) // Use upsert to handle both insert and ID-provided update
    .select('id')
    .maybeSingle();

  if (dbError) {
    console.error("Supabase Database Upsert Error:", dbError);
    throw new Error(`数据库保存失败: ${dbError.message}`);
  }

  photoCache.clear();
  const finalPhotoId = savedPhoto?.id || photo.id;

  if (photo.id !== finalPhotoId) {
    photo.id = finalPhotoId;
  }

  const sTagIds = safeArray(photo.tagIds);
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
  let sPhotos = safeArray(photos);
  if (sPhotos.length === 0) return [];

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error('No active session for database');
  }

  // Pre-filter duplicates
  const uniquePhotos: Photo[] = [];
  for (const photo of sPhotos) {
    if (photo.image_hash) {
      const isDuplicate = await checkDuplicate(
        session.user.id, 
        photo.image_hash, 
        (photo as any)._fileSize, 
        (photo as any)._fileName, 
        (photo as any)._lastModified,
        photo.id
      );
      if (isDuplicate) {
        console.log(`[savePhotosToCloudBatch] Skipped duplicate: ${photo.name}`);
        continue;
      }
    }
    uniquePhotos.push(photo);
  }

  sPhotos = uniquePhotos;
  if (sPhotos.length === 0) return [];

  for (const photo of sPhotos) {
    if (!photo.image_url && photo.uri) {
      try {
        const filename = photo.storageId || photo.id;
        const { imageUrl, thumbUrl } = await uploadImages(userId, filename, photo.uri);
        photo.image_url = imageUrl;
        photo.thumb_url = thumbUrl;
      } catch (e) {
        console.error("Failed to upload image in batch:", e);
        throw e; // Propagate error
      }
    }
  }

  const results: Photo[] = [...sPhotos.map(p => ({ ...p }))];
  const payloads = sPhotos.map(photo => {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(photo.id);
    
    normalizeDimensionsBeforeSave(photo.dimensions);

    const payload: Record<string, unknown> = {
      user_id: session.user.id,
      item_code: photo.item_code,
      manual_code: photo.manual_code || '',
      image_hash: photo.image_hash,
      name: photo.name,
      category_id: photo.categoryId || null,
      manufacturer_id: photo.manufacturerId || null,
      description: photo.description || '',
      image_url: photo.image_url,
      thumb_url: photo.thumb_url || null,
      dimensions: photo.dimensions || null,
      model_number: photo.model_number || '',
      description_translations: photo.description_translations || null,
      created_at: photo.createdAt,
      group_id: photo.groupId || null,
      is_group_cover: photo.isGroupCover || false,
      is_hidden: photo.is_hidden || false,
      updated_at: photo.updatedAt || new Date().toISOString()
    };
    if (isUUID) {
      payload.id = photo.id;
    }
    return payload;
  });

  const chunkSize = PAGINATION.CHUNK_SIZE;
  for (let i = 0; i < payloads.length; i += chunkSize) {
    const chunk = payloads.slice(i, i + chunkSize);
    let { data: savedRows, error: dbError } = await supabase
      .from(DB_CONFIG.TABLE_NAME)
      .upsert(chunk, { onConflict: 'id', ignoreDuplicates: false })
      .select('id, image_hash');

    if (dbError && dbError.message.includes('column')) {
       console.warn("DB Schema mismatch, retrying chunk without group columns...");
       const safeChunk = chunk.map(p => {
         const cp = { ...p };
         delete cp.group_id;
         delete cp.is_group_cover;
         return cp;
       });
       const retry = await supabase.from(DB_CONFIG.TABLE_NAME).upsert(safeChunk, { onConflict: 'id' }).select('id, image_hash');
       savedRows = retry.data;
       dbError = retry.error;
    }

    if (dbError) {
      console.error("Bulk Upsert Error:", dbError);
      throw new Error(`批量同步失敗: ${dbError.message}`);
    }
    
    photoCache.clear();
    if (savedRows) {
      const usedIndexes = new Set<number>();
      savedRows.forEach((row: { id: string; image_hash: string }) => {
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

  const photoIdsToUpdate = safeArray(results).map(p => p.id);
  
  for (let i = 0; i < photoIdsToUpdate.length; i += 100) {
     const chunkIds = photoIdsToUpdate.slice(i, i + 100);
     await supabase.from('photo_tags').delete().in('photo_id', chunkIds);
  }

  const newTagAssociations: { photo_id: string; tag_id: string }[] = [];
  safeArray(results).forEach(p => {
    const pTagIds = safeArray(p.tagIds);
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
