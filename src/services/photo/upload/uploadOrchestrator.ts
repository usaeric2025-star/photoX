import { generateId } from '@/lib/id';
import { logger } from '@/lib/logger';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { Photo } from '../../../types';
import { uploadToR2 } from './r2Client';
import { upsertPhotoRecord, syncPhotoTagsInDB } from './dbCommands';
import { mapToDb, normalizeDimensionsBeforeSave } from '../mappers';
import { checkDuplicate, DuplicatePhotoError } from '@/services/photo/duplicateCheck';
import { supabase } from '../../../lib/supabase';
import { DB_CONFIG } from '../../../constants/config';
import { generateItemCode } from '../utils';
import { storage } from '@/services/storage';

export const uploadSinglePhoto = async (
  userId: string, 
  photo: Photo, 
  onStatus?: (s: string) => void
): Promise<{ id: string; is_duplicate?: boolean }> => {
    const { data: { session } } = await supabase.auth.getSession();
    const isLocalStorageStaff = !!storage.getItem('ais_mock_auth_passcode');

    if (!session?.user && !isLocalStorageStaff) {
        throw ErrorFactory.permission('鑒權失敗：無活躍會話');
    }


    const actUserId = session?.user?.id || userId || 'staff';
    let is_duplicate = false;
    
    // 1. Duplicate Check
    if (photo.image_hash) {
        const dbCheck = await checkDuplicate(
            actUserId, 
            photo.image_hash, 
            photo._fileSize, 
            photo._fileName, 
            photo._lastModified,
            photo.id
        );
        if (dbCheck.isDuplicate) {
             logger.info(`[Upload] Skipping duplicate photo: ${photo.id || photo._fileName}. Existing ID: ${dbCheck.existingId}`);
             return { id: dbCheck.existingId || photo.id || 'duplicate', is_duplicate: true };
        }
        
        if (dbCheck.orphanId) {
             photo.id = dbCheck.orphanId;
        }
    }

    // 2. R2 Upload (MUST HAPPEN BEFORE FINAL DB UPSERT)
    if (!photo.image_url && photo.uri) {
        const filename = photo.storage_id || photo.id;
        const { imageUrl, isDuplicate: r2Duplicate } = await uploadToR2(userId, filename, photo.uri, photo.image_hash, onStatus);
        if (r2Duplicate) {
            logger.info(`[Upload] R2 confirmed duplicate file for ${photo.id}. Reusing URL: ${imageUrl}`);
            is_duplicate = true;
        }
        photo.image_url = imageUrl;
    }

    if (!photo.image_url) {
        throw ErrorFactory.fatal('Upload failed: No image URL generated', { context: 'uploadOrchestrator' });
    }

    if (!photo.item_code) {
        photo.item_code = generateItemCode();
    }

    normalizeDimensionsBeforeSave(photo.dimensions);

    if (!photo.id || photo.id.startsWith('temp-')) {
        photo.id = generateId();
    }
    
    const payload = mapToDb({
        ...photo,
        user_id: actUserId,
    }, true);
    
    if (!payload.id) payload.id = photo.id;

    // 3. Final DB Upsert (ONLY AFTER R2 IS SUCCESSFUL)
    await upsertPhotoRecord(payload);
    
    // 4. Tag Sync
    try {
        await syncPhotoTagsInDB(photo.id, (photo.tags || []).map(t => String(t.id)));
    } catch (e) {
        logger.warn("Failed to sync photo tags:", e instanceof Error ? e.message : String(e));
    }

    return { id: photo.id, is_duplicate };
};
