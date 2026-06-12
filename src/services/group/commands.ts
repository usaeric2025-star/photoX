import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { success } from '@/lib/error/ErrorFactory';
import { withSupabase } from '@/lib/error/supabaseWrapper';
import { withErrorHandling } from '@/lib/error/wrapper';
import type { AppResult } from '@/types/api';
import { supabase } from '../../lib/supabase';
import { DB_CONFIG } from '../../constants/config';
import { ProductGroup } from '../../types';
import { createGroupValidator } from '../../lib/validators/factory';
import { cleanTranslationPrefixes } from '@/lib/ai/safeText';
import { ungroupPhotos, syncGroupMemberCount } from '@/services/photo/groupUtils';
import { api } from '@/lib/api';

const TABLE_NAME = 'groups';

const mapToDb = (updates: Partial<ProductGroup> & Record<string, unknown>, userId?: string): Record<string, unknown> => {
    const dbUpdates: Record<string, unknown> = { ...updates };
    dbUpdates.updated_at = new Date().toISOString();
    if (userId && !dbUpdates.user_id) {
        dbUpdates.user_id = userId;
    }

    if ('name' in dbUpdates) {
        const val = dbUpdates.name;
        if (typeof val === 'string') {
            dbUpdates.name = { zh: cleanTranslationPrefixes(val).trim(), en: '', ms: '' };
        } else if (val && typeof val === 'object') {
            let nameObj = val as Record<string, unknown>;
            if (nameObj.zh && typeof nameObj.zh === 'object' && ('zh' in nameObj.zh || 'en' in nameObj.zh || 'ms' in nameObj.zh)) {
                nameObj = nameObj.zh;
            }
            dbUpdates.name = {
                zh: cleanTranslationPrefixes(String(nameObj.zh || '')).trim(),
                en: cleanTranslationPrefixes(String(nameObj.en || '')).trim(),
                ms: cleanTranslationPrefixes(String(nameObj.ms || '')).trim(),
            };
        }
    }

    if ('description' in dbUpdates) {
        const val = dbUpdates.description;
        if (typeof val === 'string') {
            dbUpdates.description = { zh: cleanTranslationPrefixes(val).trim(), en: '', ms: '' };
        } else if (val && typeof val === 'object') {
            let descObj = val as Record<string, unknown>;
            if (descObj.zh && typeof descObj.zh === 'object' && ('zh' in descObj.zh || 'en' in descObj.zh || 'ms' in descObj.zh)) {
                descObj = descObj.zh;
            }
            dbUpdates.description = {
                zh: cleanTranslationPrefixes(String(descObj.zh || '')).trim(),
                en: cleanTranslationPrefixes(String(descObj.en || '')).trim(),
                ms: cleanTranslationPrefixes(String(descObj.ms || '')).trim(),
            };
        }
    }

    return dbUpdates;
};

const getCurrentUserId = async (): Promise<string | undefined> => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id;
};

export async function createGroup(data: ProductGroup): Promise<AppResult<ProductGroup>> {
  return withErrorHandling(async () => {
    const validator = createGroupValidator();
    const validationRes = validator.validate(data);
    if (!validationRes.ok) return validationRes as AppResult<ProductGroup>;

    const userId = await getCurrentUserId();
    const dbData = mapToDb(data as any, userId);
    
    const res = await api.groups.$post({
        json: { groupData: dbData }
    });
    if (!res.ok) throw ErrorFactory.wrap(new Error('Create group failed'), 'commands');
    const { data: resData } = await res.json();
    return success(resData);
  }, 'createGroup');
}

export async function updateGroup(id: string, updates: Partial<ProductGroup>): Promise<AppResult<ProductGroup>> {
  return withErrorHandling(async () => {
    const validator = createGroupValidator();
    const validationRes = validator.validate({ ...updates, id } as any);
    if (!validationRes.ok) return validationRes as AppResult<ProductGroup>;

    const userId = await getCurrentUserId();
    const dbUpdates = mapToDb(updates, userId);
    
    const res = await api.groups[':id'].$put({
        param: { id },
        json: { updates: dbUpdates }
    });
    if (!res.ok) throw ErrorFactory.wrap(new Error('Update group failed'), 'commands');
    const { data: resData } = await res.json();
    return success(resData);
  }, 'updateGroup');
}

export async function upsertGroup(group: Partial<ProductGroup> & { id: string }): Promise<AppResult<void>> {
  return withErrorHandling(async () => {
    const userId = await getCurrentUserId();
    const dbUpdates = mapToDb(group, userId);
    const res = await api.groups.upsert.$post({
        json: dbUpdates
    });
    if (!res.ok) throw ErrorFactory.wrap(new Error('Upsert group failed'), 'commands');
    return success(undefined);
  }, 'upsertGroup');
}

export async function deleteGroup(id: string): Promise<AppResult<void>> {
  return withErrorHandling(async () => {
    const ungroupRes = await ungroupPhotos(id);
    if (!ungroupRes.ok) return ungroupRes;

    const res = await api.groups[':id'].$delete({
        param: { id }
    });
    if (!res.ok) throw ErrorFactory.wrap(new Error('Delete group failed'), 'commands');
    return success(undefined);
  }, 'deleteGroup');
}

// Action aliases for legacy or specific naming compliance
export const createGroupAction = createGroup;
export const updateGroupAction = updateGroup;
export const saveGroup = upsertGroup;
export const deleteGroupFromCloud = deleteGroup;

export { ungroupPhotos, syncGroupMemberCount } from '@/services/photo/groupUtils';

export const groupPhotos = async (
  photoIds: string[], 
  predefinedGroupId?: string, 
  metadata?: {
    name?: any;
    description?: any;
  }
): Promise<AppResult<{ newGroupId: string }>> => {
  return withErrorHandling(async () => {
    if (photoIds.length <= 1) {
      throw ErrorFactory.wrap(new Error('至少需要選擇兩張照片才能成組'), 'commands');
    }
    
    const targetGroupId = predefinedGroupId || crypto.randomUUID();
    const { supabase } = await import('@/lib/supabase');
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    // Use photos by-ids instead of supabase.from
    const { loadPhotosByIds } = await import('@/services/photo/read');
    const selectedRes = await loadPhotosByIds(photoIds);
    if (!selectedRes.ok) return selectedRes;

    const sourceGroupIds = Array.from(new Set(
      (selectedRes.data || [])
        .map(p => p.group_id)
        .filter((gid): gid is string => !!gid && gid !== targetGroupId)
    ));

    const ungroupedValidIds = photoIds.filter(id => {
      const p = selectedRes.data?.find(x => x.id === id);
      return !p?.group_id;
    });

    // Derive a name if missing
    let finalName = metadata?.name;
    if (!finalName) {
      const p = selectedRes.data?.[0];
      if (p?.name) {
         finalName = typeof p.name === 'string' ? { zh: p.name, en: p.name, ms: p.name } : p.name;
      } else {
         finalName = { zh: 'New Collection', en: 'New Collection', ms: 'New Collection' };
      }
    }

    // Prepare Group Record
    const groupData = {
      name: finalName,
      description: metadata?.description || { zh: '', en: '', ms: '' },
      updated_at: new Date().toISOString()
    };

    const groupPhotosRes = await api.groups['group-photos'].$post({
      json: {
        targetGroupId,
        userId,
        photoIds,
        groupData,
        sourceGroupIds,
        ungroupedValidIds
      }
    });

    if (!groupPhotosRes.ok) throw ErrorFactory.wrap(new Error('Group photos failed'), 'commands');

    const syncRes = await syncGroupMemberCount(targetGroupId);
    if (!syncRes.ok) return syncRes;

    return success({ newGroupId: targetGroupId });
  }, 'groupPhotos');
};

export const movePhotosToGroup = async (photoIds: string[], targetGroupId: string | null): Promise<AppResult<void>> => {
  return withErrorHandling(async () => {
    const res = await api.groups['move-photos'].$post({
        json: { photoIds, targetGroupId }
    });
    if (!res.ok) throw ErrorFactory.wrap(new Error('Move photos failed'), 'commands');
    return success(undefined);
  }, 'movePhotosToGroup');
};

export const setPhotoAsGroupCover = async (photoId: string | null, groupId: string): Promise<AppResult<void>> => {
  return withErrorHandling(async () => {
    if (!groupId) throw ErrorFactory.wrap(new Error('GroupId is required'), 'commands');
    const res = await api.groups['set-cover'].$post({
        json: { photoId, groupId }
    });
    if (!res.ok) throw ErrorFactory.wrap(new Error('Set photo cover failed'), 'commands');
    return success(undefined);
  }, 'setPhotoAsGroupCover');
};
