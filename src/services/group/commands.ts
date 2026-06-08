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
            let nameObj = val as Record<string, any>;
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
            let descObj = val as Record<string, any>;
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
    
    const query = supabase
        .from(TABLE_NAME)
        .insert(dbData)
        .select()
        .single();

    const res = await withSupabase(query, 'createGroup');
    if (!res.ok) return res;
    return success(res.data);
  }, 'createGroup');
}

export async function updateGroup(id: string, updates: Partial<ProductGroup>): Promise<AppResult<ProductGroup>> {
  return withErrorHandling(async () => {
    const validator = createGroupValidator();
    const validationRes = validator.validate({ ...updates, id } as any);
    if (!validationRes.ok) return validationRes as AppResult<ProductGroup>;

    const userId = await getCurrentUserId();
    const dbUpdates = mapToDb(updates, userId);
    
    const query = supabase
        .from(TABLE_NAME)
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

    const res = await withSupabase(query, 'updateGroup');
    if (!res.ok) return res;
    return success(res.data);
  }, 'updateGroup');
}

export async function upsertGroup(group: Partial<ProductGroup> & { id: string }): Promise<AppResult<void>> {
  return withErrorHandling(async () => {
    const userId = await getCurrentUserId();
    const dbUpdates = mapToDb(group, userId);
    const query = supabase
        .from(TABLE_NAME)
        .upsert(dbUpdates, { onConflict: 'id' });

    const res = await withSupabase(query, 'upsertGroup', 'high', { allowNull: true });
    if (!res.ok) return res;
    return success(undefined);
  }, 'upsertGroup');
}

export async function deleteGroup(id: string): Promise<AppResult<void>> {
  return withErrorHandling(async () => {
    const ungroupRes = await ungroupPhotos(id);
    if (!ungroupRes.ok) return ungroupRes;

    const userId = await getCurrentUserId();
    let query = supabase.from(TABLE_NAME).delete().eq('id', id);
    if (userId) query = query.eq('user_id', userId);
    
    const res = await withSupabase(query, 'deleteGroup', 'high', { allowNull: true });
    if (!res.ok) return res;
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
      throw new Error('至少需要選擇兩張照片才能成組');
    }
    
    const targetGroupId = predefinedGroupId || crypto.randomUUID();
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    const querySelected = supabase
      .from(DB_CONFIG.TABLE_NAME)
      .select('id, group_id')
      .in('id', photoIds);

    const selectedRes = await withSupabase(querySelected, 'groupPhotos/select');
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

    // Prepare Group Record
    const groupData = {
      name: metadata?.name || { zh: '新合組', en: 'New Combined Group', ms: 'Kumpulan Baru' },
      description: metadata?.description || { zh: '', en: '', ms: '' },
      updated_at: new Date().toISOString()
    };

    const checkQuery = supabase.from('groups').select('id').eq('id', targetGroupId).maybeSingle();
    const checkRes = await withSupabase(checkQuery, 'groupPhotos/check', 'high', { allowNull: true });
    if (!checkRes.ok) return checkRes;

    if (!checkRes.data) {
      const insertQuery = supabase.from('groups').insert({
        id: targetGroupId,
        user_id: userId,
        is_hidden: false,
        created_at: new Date().toISOString(),
        ...groupData
      });
      const insertRes = await withSupabase(insertQuery, 'groupPhotos/insert', 'high', { allowNull: true });
      if (!insertRes.ok) return insertRes;
    } else {
      const updateQuery = supabase.from('groups').update(groupData).eq('id', targetGroupId);
      const updateRes = await withSupabase(updateQuery, 'groupPhotos/update', 'high', { allowNull: true });
      if (!updateRes.ok) return updateRes;
    }

    // Merge
    if (sourceGroupIds.length > 0) {
      const mergeQuery = supabase.rpc('merge_groups', {
        source_group_ids: sourceGroupIds,
        target_group_id: targetGroupId
      });
      const mergeRes = await withSupabase(mergeQuery, 'groupPhotos/merge', 'high', { allowNull: true });
      if (!mergeRes.ok) return mergeRes;
    }

    if (ungroupedValidIds.length > 0) {
      const updatePhotoQuery = supabase
        .from(DB_CONFIG.TABLE_NAME)
        .update({ group_id: targetGroupId, is_group_cover: false })
        .in('id', ungroupedValidIds);
      const updatePhotoRes = await withSupabase(updatePhotoQuery, 'groupPhotos/updatePhotos', 'high', { allowNull: true });
      if (!updatePhotoRes.ok) return updatePhotoRes;
    }

    const syncRes = await syncGroupMemberCount(targetGroupId);
    if (!syncRes.ok) return syncRes;

    return success({ newGroupId: targetGroupId });
  }, 'groupPhotos');
};

export const movePhotosToGroup = async (photoIds: string[], targetGroupId: string | null): Promise<AppResult<void>> => {
  return withErrorHandling(async () => {
    const query = supabase.rpc('move_photos_to_group', {
      photo_ids: photoIds,
      target_group_id: targetGroupId
    });
    const res = await withSupabase(query, 'movePhotosToGroup', 'high', { allowNull: true });
    if (!res.ok) return res;
    return success(undefined);
  }, 'movePhotosToGroup');
};

export const setPhotoAsGroupCover = async (photoId: string | null, groupId: string): Promise<AppResult<void>> => {
  return withErrorHandling(async () => {
    if (!groupId) throw new Error('GroupId is required');

    const resetQuery = supabase
      .from(DB_CONFIG.TABLE_NAME)
      .update({ is_group_cover: false })
      .eq('group_id', groupId);

    const resetRes = await withSupabase(resetQuery, 'setPhotoAsGroupCover/reset', 'high', { allowNull: true });
    if (!resetRes.ok) return resetRes;

    if (photoId) {
      const setQuery = supabase
        .from(DB_CONFIG.TABLE_NAME)
        .update({ is_group_cover: true })
        .eq('id', photoId);
      const setRes = await withSupabase(setQuery, 'setPhotoAsGroupCover/set', 'high', { allowNull: true });
      if (!setRes.ok) return setRes;
    }

    const updateGroupQuery = supabase
      .from('groups')
      .update({ cover_photo_id: photoId || null })
      .eq('id', groupId);
    const updateGroupRes = await withSupabase(updateGroupQuery, 'setPhotoAsGroupCover/updateGroup', 'high', { allowNull: true });
    if (!updateGroupRes.ok) return updateGroupRes;

    return success(undefined);
  }, 'setPhotoAsGroupCover');
};
