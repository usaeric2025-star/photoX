import { generateId } from '#lib/id.js';
import { supabase } from '#lib/supabase.js';
import { DB_CONFIG } from '#src/constants/config.js';
import { ProductGroup } from '#src/types/index.js';
import * as v from 'valibot';
import { GroupReqSchema } from '#shared/apiContractSchema.js';
import { cleanTranslationPrefixes } from '#src/features/ai/safeText.js';
import { ungroupPhotos, syncGroupMemberCount } from '#src/services/photo/utils.js';
import { api } from '#lib/api.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';

const TABLE_NAME = 'groups';

const mapToDb = (updates: Record<string, unknown>, userId?: string): Record<string, unknown> => {
    const dbUpdates: Record<string, unknown> = { ...updates };
    dbUpdates.updated_at = new Date().toISOString();
    if (userId) {
        dbUpdates.user_id = userId;
    }

    if ('name' in dbUpdates) {
        const val = dbUpdates.name;
        if (typeof val === 'string') {
            dbUpdates.name = cleanTranslationPrefixes(val).trim();
        } else if (val && typeof val === 'object') {
            const nameObj = val as Record<string, unknown>;
            // Prioritize English name if available, otherwise any translation, but return as STRING
            dbUpdates.name = cleanTranslationPrefixes(String(nameObj.en || nameObj.zh || nameObj.ms || '')).trim();
        }
    }

    if ('description' in dbUpdates) {
        const val = dbUpdates.description;
        if (typeof val === 'string') {
            dbUpdates.description = val;
        } else if (val && typeof val === 'object') {
            dbUpdates.description = JSON.stringify(val);
        }
    }

    return dbUpdates;
};

const getCurrentUserId = async (): Promise<string | undefined> => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id;
};

export async function createGroup(data: Partial<ProductGroup> & { name: string | Record<string, string> }): Promise<ProductGroup> {
  v.parse(v.partial(GroupReqSchema), data);

  const userId = await getCurrentUserId();
  const dbData = mapToDb(data as unknown as Record<string, unknown>, userId);
  
  const res = await api.groups.$post({
      json: { groupData: dbData }
  });
  if (!res.ok) throw new Error('Create group failed');
  const { data: resData } = (await res.json()) as { data: ProductGroup };
  return resData;
}

export async function updateGroup(id: string, updates: Partial<ProductGroup>): Promise<ProductGroup> {
  const userId = await getCurrentUserId();
  const dbUpdates = mapToDb(updates as unknown as Record<string, unknown>, userId);
  
  v.parse(v.partial(GroupReqSchema), { ...dbUpdates, id });

  const res = await api.groups[':id'].$put({
      param: { id },
      json: { updates: dbUpdates }
  });
  if (!res.ok) throw new Error('Update group failed');
  const { data: resData } = (await res.json()) as { data: ProductGroup };
  return resData;
}

export async function upsertGroup(group: Partial<ProductGroup> & { id: string }): Promise<void> {
  const userId = await getCurrentUserId();
  const dbUpdates = mapToDb(group as unknown as Record<string, unknown>, userId);
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
// Removed aliases

export { ungroupPhotos,  } from '#src/services/photo/utils.js';

export const groupPhotos = async (
  photoIds: string[], 
  predefinedGroupId?: string, 
  metadata?: {
    name?: string | Record<string, string>;
    description?: string | Record<string, string>;
  }
): Promise<{ newGroupId: string }> => {
  if (photoIds.length === 0) {
    throw new Error('至少需要一張照片才能成組');
  }
  
  const targetGroupId = predefinedGroupId || generateId();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id || 'staff';

  // Strictly enforce 'GROUP' for all new groups as per user rule: "新的合组一律叫GROUP，不要乱改。"
  let finalName = 'GROUP';
  
  // Prepare Group Record
  const groupData = {
    id: targetGroupId,
    name: finalName,
    description: metadata?.description ? (typeof metadata.description === 'object' ? JSON.stringify(metadata.description) : metadata.description) : null,
    status: 'active' as 'active' | 'draft',
  };

  const groupPhotosRes = await api.groups['group-photos'].$post({
    json: {
      targetGroupId,
      userId: userId,
      photoIds,
      groupData
    }
  });

  if (!groupPhotosRes.ok) {
    const errorText = await groupPhotosRes.text();
    let msg = 'Group photos failed: ' + errorText;
    let traceId: string | undefined;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.error) {
        if (typeof parsed.error === 'object') {
          msg = parsed.error.message || parsed.error.summary || JSON.stringify(parsed.error);
        } else {
          msg = parsed.error;
        }
      }
      if (parsed.traceId) traceId = parsed.traceId;
    } catch (_) {}
    
    throw ErrorFactory.wrap(new Error(msg), '分组照片', traceId);
  }

  return { newGroupId: targetGroupId };
};

export const movePhotosToGroup = async (photoIds: string[], targetGroupId: string | null): Promise<void> => {
  if (targetGroupId === null) {
      return removePhotosFromGroup(photoIds, ''); // Fallback but better use the dedicated function
  }
  const res = await api.groups['move-photos'].$post({
      json: { photoIds, targetGroupId }
  });
  if (!res.ok) {
    const errorText = await res.text();
    let msg = 'Move photos failed: ' + errorText;
    let traceId: string | undefined;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.error) msg = 'Move photos failed: ' + parsed.error;
      if (parsed.traceId) traceId = parsed.traceId;
    } catch (_) {}
    
    const err = new Error(msg) as Error & { traceId?: string };
    if (traceId) {
      err.traceId = traceId;
    }
    throw err;
  }
};

export const removePhotosFromGroup = async (photoIds: string[], groupId: string): Promise<void> => {
  const res = await api.groups['remove-photos'].$delete({
      json: { photoIds, groupId }
  });
  if (!res.ok) throw new Error('Remove photos from group failed');
};

export const setPhotoAsGroupCover = async (photoId: string | null, groupId: string): Promise<void> => {
  if (!groupId) throw new Error('GroupId is required');
  const res = await api.groups['set-cover'].$post({
      json: { photoId, groupId }
  });
  if (!res.ok) throw new Error('Set photo cover failed');
};