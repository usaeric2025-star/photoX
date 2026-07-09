import { generateId } from '#lib/id.js';
import { supabase } from '#lib/supabase.js';
import { DB_CONFIG } from '#src/constants/config.js';
import { ProductGroup } from '#src/types/index.js';
import * as v from 'valibot';
import { GroupReqSchema } from '#shared/apiContractSchema.js';
import { cleanTranslationPrefixes } from '#src/features/ai/safeText.js';
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

export const ungroupPhotos = async (groupId: string): Promise<void> => {
  await ErrorFactory.unwrap<void>(
    api.groups.ungroup.$post({
      json: { groupId }
    }),
    'Ungroup failed'
  );
};

export const syncGroupMemberCount = async (groupId: string): Promise<void> => {
  if (!groupId) return;
  await ErrorFactory.unwrap<void>(
    api.groups['sync-count'].$post({
      json: { groupId }
    }),
    'Sync count failed'
  );
};

export async function createGroup(data: Partial<ProductGroup> & { name: string | Record<string, string> }): Promise<ProductGroup> {
  v.parse(v.partial(GroupReqSchema), data);

  const userId = await getCurrentUserId();
  const dbData = mapToDb(data as unknown as Record<string, unknown>, userId);
  
  return ErrorFactory.unwrap<ProductGroup>(
    api.groups.$post({
      json: { groupData: dbData }
    }),
    'Create group failed'
  );
}

export async function updateGroup(id: string, updates: Partial<ProductGroup>): Promise<ProductGroup> {
  const userId = await getCurrentUserId();
  const dbUpdates = mapToDb(updates as unknown as Record<string, unknown>, userId);
  
  v.parse(v.partial(GroupReqSchema), { ...dbUpdates, id });

  return ErrorFactory.unwrap<ProductGroup>(
    api.groups[':id'].$put({
      param: { id },
      json: { updates: dbUpdates }
    }),
    'Update group failed'
  );
}

export async function upsertGroup(group: Partial<ProductGroup> & { id: string }): Promise<void> {
  const userId = await getCurrentUserId();
  const dbUpdates = mapToDb(group as unknown as Record<string, unknown>, userId);
  await ErrorFactory.unwrap<void>(
    api.groups.upsert.$post({
      json: dbUpdates
    }),
    'Upsert group failed'
  );
}

export async function deleteGroup(id: string): Promise<void> {
  await ungroupPhotos(id);

  await ErrorFactory.unwrap<void>(
    api.groups[':id'].$delete({
      param: { id }
    }),
    'Delete group failed'
  );
}

// Action aliases for legacy or specific naming compliance
// Removed aliases

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
    status: 'active' as 'active' | 'confirmed',
  };

  await ErrorFactory.unwrap(
    api.groups['group-photos'].$post({
      json: {
        targetGroupId,
        userId: userId,
        photoIds,
        groupData
      }
    }),
    '分组照片失败'
  );

  return { newGroupId: targetGroupId };
};

export const movePhotosToGroup = async (photoIds: string[], targetGroupId: string | null): Promise<void> => {
  if (targetGroupId === null) {
      return removePhotosFromGroup(photoIds, ''); // Fallback but better use the dedicated function
  }
  await ErrorFactory.unwrap<void>(
    api.groups['move-photos'].$post({
      json: { photoIds, targetGroupId }
    }),
    'Move photos failed'
  );
};

export const removePhotosFromGroup = async (photoIds: string[], groupId: string): Promise<void> => {
  await ErrorFactory.unwrap<void>(
    api.groups['remove-photos'].$post({
      json: { photoIds, groupId }
    }),
    'Remove photos from group failed'
  );
};

export const setPhotoAsGroupCover = async (photoId: string | null, groupId: string): Promise<void> => {
  if (!groupId) throw new Error('GroupId is required');
  await ErrorFactory.unwrap<void>(
    api.groups['set-cover'].$post({
      json: { photoId, groupId }
    }),
    'Set photo cover failed'
  );
};