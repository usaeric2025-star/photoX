import { generateId } from '@/lib/id';
import { supabase } from '../../lib/supabase';
import { DB_CONFIG } from '../../constants/config';
import { ProductGroup } from '../../types';
import { createGroupValidator } from '../../lib/validators/factory';
import { cleanTranslationPrefixes } from '@/services/ai/safeText';
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

export async function createGroup(data: ProductGroup): Promise<ProductGroup> {
  const validator = createGroupValidator();
  validator.validate(data);

  const userId = await getCurrentUserId();
  const dbData = mapToDb(data as any, userId);
  
  const res = await api.groups.$post({
      json: { groupData: dbData }
  });
  if (!res.ok) throw new Error('Create group failed');
  const { data: resData } = await res.json();
  return resData;
}

export async function updateGroup(id: string, updates: Partial<ProductGroup>): Promise<ProductGroup> {
  const validator = createGroupValidator();
  validator.validate({ ...updates, id } as any);

  const userId = await getCurrentUserId();
  const dbUpdates = mapToDb(updates, userId);
  
  const res = await api.groups[':id'].$put({
      param: { id },
      json: { updates: dbUpdates }
  });
  if (!res.ok) throw new Error('Update group failed');
  const { data: resData } = await res.json();
  return resData;
}

export async function upsertGroup(group: Partial<ProductGroup> & { id: string }): Promise<void> {
  const userId = await getCurrentUserId();
  const dbUpdates = mapToDb(group, userId);
  const res = await api.groups.upsert.$post({
      json: dbUpdates
  });
  if (!res.ok) throw new Error('Upsert group failed');
}

export async function deleteGroup(id: string): Promise<void> {
  await ungroupPhotos(id);

  const res = await api.groups[':id'].$delete({
      param: { id }
  });
  if (!res.ok) throw new Error('Delete group failed');
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
): Promise<{ newGroupId: string }> => {
  if (photoIds.length === 0) {
    throw new Error('至少需要一張照片才能成組');
  }
  
  const targetGroupId = predefinedGroupId || generateId();
  const { supabase } = await import('@/lib/supabase');
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  // Derive a name if missing: "全面强制 合组新合并就叫GROUP，除非改名。"
  let finalName = metadata?.name || { zh: 'GROUP', en: 'GROUP', ms: 'GROUP' };

  // Prepare Group Record
  const groupData = {
    name: finalName,
    description: metadata?.description || { zh: '', en: '', ms: '' },
    updated_at: new Date().toISOString()
  };

  const groupPhotosRes = await api.groups['group-photos'].$post({
    json: {
      targetGroupId,
      userId: userId as string,
      photoIds,
      groupData
    }
  });

  if (!groupPhotosRes.ok) throw new Error('Group photos failed');

  return { newGroupId: targetGroupId };
};

export const movePhotosToGroup = async (photoIds: string[], targetGroupId: string | null): Promise<void> => {
  const res = await api.groups['move-photos'].$post({
      json: { photoIds, targetGroupId }
  });
  if (!res.ok) throw new Error('Move photos failed');
};

export const setPhotoAsGroupCover = async (photoId: string | null, groupId: string): Promise<void> => {
  if (!groupId) throw new Error('GroupId is required');
  const res = await api.groups['set-cover'].$post({
      json: { photoId, groupId }
  });
  if (!res.ok) throw new Error('Set photo cover failed');
};
