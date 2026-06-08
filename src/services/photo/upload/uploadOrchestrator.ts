import { withErrorHandling } from '@/lib/error/wrapper';
import { AppResult, errorFactory, success } from '@/lib/error/ErrorFactory';
import { Photo } from '../../../types';
import { uploadToR2 } from './r2Client';
import { upsertPhotoRecord, syncPhotoTagsInDB } from './dbCommands';
import { mapToDb, normalizeDimensionsBeforeSave } from '../photoMappingUtils';
import { checkDuplicate, DuplicatePhotoError } from '@/lib/data/duplicateCheck';
import { supabase } from '../../../lib/supabase';
import { DB_CONFIG } from '../../../constants/config';
import { generateItemCode } from '../utils';

export const uploadSinglePhoto = async (
  userId: string, 
  photo: Photo, 
  onStatus?: (s: string) => void
): Promise<AppResult<{ id: string; is_duplicate?: boolean }>> => {
  return withErrorHandling(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const isLocalStorageStaff = typeof window !== 'undefined' && !!window.localStorage.getItem('ais_mock_auth_passcode');

    if (!session?.user && !isLocalStorageStaff) {
        throw new Error('鉴权失敗: 無活躍會話');
    }

    const actUserId = session?.user?.id || userId || 'staff';
    let is_duplicate = false;
    
    // 1. Duplicate Check
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
             console.log(`[Upload] Skipping duplicate photo: ${photo.id || (photo as any)._fileName}. Existing ID: ${dbCheck.existingId}`);
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
            console.log(`[Upload] R2 confirmed duplicate file for ${photo.id}. Reusing URL: ${imageUrl}`);
            is_duplicate = true;
        }
        photo.image_url = imageUrl;
    }

    if (!photo.image_url) {
        throw new Error('Upload failed: No image URL generated');
    }

    normalizeDimensionsBeforeSave(photo.dimensions);

    if (!photo.id || photo.id.startsWith('temp-')) {
        photo.id = crypto.randomUUID();
    }
    
    const payload: any = mapToDb({
        ...photo,
        user_id: actUserId,
    }, true);
    
    if (!payload.id) payload.id = photo.id;

    // 3. Final DB Upsert (ONLY AFTER R2 IS SUCCESSFUL)
    const saveResult = await upsertPhotoRecord(payload);
    if (!saveResult.ok) throw new Error(saveResult.message);
    
    // 4. Tag Sync
    const tagSync = await syncPhotoTagsInDB(photo.id, (photo.tags || []).map(t => String(t.id)));
    if (!tagSync.ok) console.warn("Failed to sync photo tags:", tagSync.message);

    return { id: photo.id, is_duplicate };
  }, 'uploadSinglePhoto');
};
