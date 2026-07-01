import { generateId } from '#lib/id/index.js';
import { logger } from '#lib/logger.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { Photo } from '#src/types/index.js';
import { uploadToR2 } from './r2Client.js';
import { upsertPhotoRecord, syncPhotoTagsInDB } from '#src/services/photo/upload/dbCommands.js';
import { mapToDb, normalizeDimensionsBeforeSave } from '#src/services/mappers/index.js';
import { checkDuplicate, DuplicatePhotoError } from '#src/services/photo/index.js';
import { supabase } from '#lib/supabase.js';
import { DB_CONFIG } from '#src/constants/config.js';
import { generateItemCode } from '#src/services/photo/utils/index.js';
import { storage } from '#src/services/storage/index.js';

export const uploadSinglePhoto = async (
  userId?: string, 
  photo?: Photo, 
  file?: File,
  onStatus?: (s: string) => void
): Promise<{ id: string; is_duplicate?: boolean }> => {
    if (!photo) throw new Error('Missing photo data');
    const { data: { session } } = await supabase.auth.getSession();
    const actUserId = session?.user?.id || userId || 'staff';
    let is_duplicate = false;
    
    // 1. Duplicate Check
    if (photo.imageHash) {
        const dbCheck = await checkDuplicate(
            actUserId, 
            photo.imageHash, 
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

    // R2 Upload (MUST HAPPEN BEFORE FINAL DB UPSERT)
    if (!photo.imageUrl && (file || photo.uri)) {
        try {
            const filename = photo.storageId || photo.id;
            const { imageUrl, isDuplicate: r2Duplicate } = await uploadToR2(userId, filename, file || photo.uri!, photo.imageHash, onStatus);
            if (r2Duplicate) {
                logger.info(`[Upload] R2 confirmed duplicate file for ${photo.id}. Reusing URL: ${imageUrl}`);
                is_duplicate = true;
            }
            photo.imageUrl = imageUrl;
        } catch (err) {
            throw ErrorFactory.wrap(err instanceof Error ? err : new Error('R2 upload failed'), 'uploadOrchestrator.R2');
        }
    }

    if (!photo.imageUrl) {
        throw ErrorFactory.fatal('Upload failed: No image URL generated', { context: 'uploadOrchestrator' });
    }

    normalizeDimensionsBeforeSave(photo.dimensions);

    if (!photo.id || photo.id.startsWith('temp-')) {
        photo.id = generateId();
    }
    
    const payload = mapToDb({
        ...photo,
        userId: actUserId,
    }, true);
    
    if (!payload.id) payload.id = photo.id;

    // 3. Final DB Upsert (ONLY AFTER R2 IS SUCCESSFUL)
    try {
        await upsertPhotoRecord(payload);
    } catch (err) {
         throw ErrorFactory.wrap(err instanceof Error ? err : new Error('Database upsert failed'), 'uploadOrchestrator.DB');
    }
    
    // 4. Tag Sync
    try {
        await syncPhotoTagsInDB(photo.id, (photo.tags || []).map(t => String(t.id)));
    } catch (e) {
        logger.warn("Failed to sync photo tags:", e instanceof Error ? e.message : String(e));
    }

    return { id: photo.id, is_duplicate };
};
