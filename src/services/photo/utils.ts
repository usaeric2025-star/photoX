import { STALE_TIMES } from '@/lib/query/config';
import { DB_CONFIG } from '@/constants/config';
import { showToast } from '@/lib/ui/toast';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { Tag, Photo, Dimension } from '@/types';
import { safeArray } from '@/lib/utils';
import { translations, TranslationType } from '@/locales';
import { getSafeText } from '@/features/ai/safeText';
import { getTranslatedCategoryName } from '@/services/category/utils';
import { Category } from '@/types';
import { generateId } from '@/lib/id';

const NEVER_ALLOWED = ['isAnalyzing', 'exif_data', 'is_hidden', 'tempId', 'isSelected', 'isDragging', 'rawResponse'];

export const generateItemCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed O, I, 1, 0
  let random = '';
  // Increased to 8 characters for much lower collision probability (approx 1 in 2.8 trillion)
  for (let i = 0; i < 8; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `X-${random}`; // e.g. X-A8B9C2D4
};

/**
 * Derives a short, human-readable code from a UUID for display purposes.
 * This ensures consistency when talking to AI or searching manually.
 */
export const getDisplayGroupCode = (groupId?: string | null): string => {
  if (!groupId) return '';
  // Use the last 6 characters of the UUID, prefixed with G-
  const short = groupId.split('-').pop()?.slice(-6).toUpperCase() || '';
  return `G-${short}`;
};

export function validateDimension(dim: Dimension | null | undefined): Dimension | null {
  if (!dim) return null;
  const rawDim = dim as unknown as Record<string, unknown>;
  const value = rawDim.value ?? dim.height ?? dim.width ?? rawDim.length ?? 0;
  
  // Local implementation of normalizeUnit since the exported one is unused elsewhere and being removed
  const u = (rawDim.unit as string | undefined)?.toLowerCase().trim();
  let unit: 'cm' | 'inch' | 'mm' = 'cm';
  if (u === 'in' || u === 'inches' || u === 'inch') unit = 'inch';
  else if (u === 'cm' || u === 'centimeter' || u === 'centimetres') unit = 'cm';
  else if (u === 'mm' || u === 'millimeter' || u === 'millimetres') unit = 'mm';
  
  return {
    ...dim,
    unit,
    height: Number(dim.height || ((rawDim.label as string)?.includes('H') ? value : 0)) || 0,
    width: Number(dim.width || ((rawDim.label as string)?.includes('W') ? value : 0)) || 0,
    length: Number(rawDim.length || ((rawDim.label as string)?.includes('D') || (rawDim.label as string)?.includes('L') ? value : 0)) || 0
  };
}

export const ungroupPhotos = async (groupId: string): Promise<void> => {
  const res = await api.groups.ungroup.$post({
    json: { groupId }
  });
  if (!res.ok) throw ErrorFactory.fatal('Ungroup failed', { context: 'groupUtils' });
};

export const syncGroupMemberCount = async (groupId: string): Promise<void> => {
  if (!groupId) return;
  const res = await api.groups['sync-count'].$post({
    json: { groupId }
  });
  if (!res.ok) throw ErrorFactory.fatal('Sync count failed', { context: 'groupUtils' });
};

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
): Promise<{ isDuplicate: boolean, orphanId?: string, existingId?: string }> => {
  if (!imageHash) return { isDuplicate: false };

  // 1. Check Memory Cache
  if (fileName && fileSize && lastModified) {
    const pseudoHash = `${fileName}_${fileSize}_${lastModified}`;
    const mappedId = memoryPseudoHashes.get(pseudoHash);
    if (mappedId && mappedId !== photoId) {
      return { isDuplicate: true, existingId: mappedId };
    }
  }

  const mappedId = memoryImageHashes.get(imageHash);
  if (mappedId && mappedId !== photoId) {
    return { isDuplicate: true, existingId: mappedId };
  }

  // 2. Check Database for MD5
  try {
    const { data, error } = await supabase
      .from(DB_CONFIG.TABLE_NAME)
      .select('id, image_url')
      .eq('image_hash', imageHash)
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (data && data.id) {
      if (photoId && data.id === photoId) {
         if (!data.image_url) {
           return { isDuplicate: false, orphanId: data.id };
         }
         return { isDuplicate: false };
      }
      
      if (!data.image_url) {
        return { isDuplicate: false, orphanId: data.id };
      }
      
      if (fileName && fileSize && lastModified) {
        memoryPseudoHashes.set(`${fileName}_${fileSize}_${lastModified}`, data.id);
      }
      memoryImageHashes.set(imageHash, data.id);
      return { isDuplicate: true, existingId: data.id };
    }
  } catch (error) {
    ErrorFactory.capture(error);
  }

  // Mark as processing
  const storeId = photoId || `cached-${Date.now()}`;
  if (fileName && fileSize && lastModified) {
    memoryPseudoHashes.set(`${fileName}_${fileSize}_${lastModified}`, storeId);
  }
  memoryImageHashes.set(imageHash, storeId);

  return { isDuplicate: false };
};

const checkDuplicateBatch = (files: File[]) => {
  const newFiles: File[] = [];
  const duplicateHashes: string[] = [];

  for (const file of files) {
    const pseudoHash = `${file.name}_${file.size}_${file.lastModified}`;
    if (memoryPseudoHashes.has(pseudoHash)) {
      duplicateHashes.push(pseudoHash);
    } else {
      newFiles.push(file);
    }
  }

  return { newFiles, duplicateHashes };
};

const removeFromDuplicateCache = (file: File, imageHash?: string) => {
  const pseudoHash = `${file.name}_${file.size}_${file.lastModified}`;
  memoryPseudoHashes.delete(pseudoHash);
  if (imageHash) {
    memoryImageHashes.delete(imageHash);
  }
};

export const runHealthCheck = async (
  allPhotos: Photo[], 
  onAuditFound: (orphans: number) => Promise<void>,
  invalidatePhotos: () => void
) => {
  showToast.success("系统自检中...");

  // 2. Group Integrity (Call standard backend API directly)
  let groupRepair = { dissolved: 0, synced: 0, deleted: 0 };
  try {
    const repairResp = await api.groups['repair-integrity'].$post();
    if (repairResp.ok) {
      const repairData = await repairResp.json();
      if (repairData.success && repairData.data) {
        groupRepair = repairData.data;
      }
    }
  } catch (err) {
    ErrorFactory.handle(err, { context: '[HealthCheck] repair-integrity failed' });
  }
  const repairCount = groupRepair.dissolved + groupRepair.synced + groupRepair.deleted;

  // 3. Storage Audit
  const auditResp = await api.storage.audit.$get();
  if (auditResp.ok) {
    const auditData = await auditResp.json();
    if (auditData.success && auditData.data?.orphans > 0) {
      await onAuditFound(auditData.data.orphans);
    }
  }

  if (repairCount > 0) {
    invalidatePhotos();
    showToast.success(`自检完成：修复合组 ${repairCount}`, { id: 'health-check' });
  } else {
    showToast.success("系统狀態正常", { id: 'health-check' });
  }
};

