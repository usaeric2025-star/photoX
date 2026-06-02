import { supabase } from '@/lib/supabase';
import { DB_CONFIG } from '@/constants/config';
import { Photo } from '@/types';

export class DuplicatePhotoError extends Error {
  constructor(message: string = '已存在相同照片') {
    super(message);
    this.name = 'DuplicatePhotoError';
  }
}

const memoryPseudoHashes = new Map<string, string>();
const memoryImageHashes = new Map<string, string>();

/**
 * Unified Deduplication Check
 */
export const checkDuplicate = async (
  userId: string,
  imageHash: string,
  fileSize?: number,
  fileName?: string,
  lastModified?: number,
  photoId?: string
): Promise<boolean> => {
  if (!imageHash) return false;

  // 1. Check Memory Cache
  if (fileName && fileSize && lastModified) {
    const pseudoHash = `${fileName}_${fileSize}_${lastModified}`;
    const mappedId = memoryPseudoHashes.get(pseudoHash);
    if (mappedId && mappedId !== photoId) {
      return true;
    }
  }

  const mappedId = memoryImageHashes.get(imageHash);
  if (mappedId && mappedId !== photoId) {
    return true;
  }

  // 2. Check Database for MD5 (strongest guarantee)
  try {
    const { data, error } = await supabase
      .from(DB_CONFIG.TABLE_NAME)
      .select('id, image_url')
      .eq('image_hash', imageHash)
      .eq('user_id', userId)
      .not('image_url', 'is', null)
      .neq('image_url', '')
      .limit(1)
      .maybeSingle();

    if (data && data.id) {
      if (photoId && data.id === photoId) {
        return false;
      }
      
      if (fileName && fileSize && lastModified) {
        memoryPseudoHashes.set(`${fileName}_${fileSize}_${lastModified}`, data.id);
      }
      memoryImageHashes.set(imageHash, data.id);
      return true;
    }
  } catch (error) {
    console.warn('DB check timeout or error, proceeding with caution', error);
  }

  // Mark as processing
  const storeId = photoId || `cached-${Date.now()}`;
  if (fileName && fileSize && lastModified) {
    memoryPseudoHashes.set(`${fileName}_${fileSize}_${lastModified}`, storeId);
  }
  memoryImageHashes.set(imageHash, storeId);

  return false;
};

export const checkDuplicateBatch = (files: File[]) => {
  const newFiles: File[] = [];
  const duplicateHashes: string[] = [];

  for (const file of files) {
    const pseudoHash = `${file.name}_${file.size}_${file.lastModified}`;
    if (memoryPseudoHashes.has(pseudoHash)) {
      duplicateHashes.push(pseudoHash);
    } else {
      newFiles.push(file);
      memoryPseudoHashes.set(pseudoHash, `cached-${Date.now()}`);
    }
  }

  return { newFiles, duplicateHashes };
};

export const removeFromDuplicateCache = (file: File, imageHash?: string) => {
  const pseudoHash = `${file.name}_${file.size}_${file.lastModified}`;
  memoryPseudoHashes.delete(pseudoHash);
  if (imageHash) {
    memoryImageHashes.delete(imageHash);
  }
};

