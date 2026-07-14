import { ProductGroup } from '#src/types/index.js';
import { api } from '#lib/api.js';
import { supabase } from '#lib/supabase.js';
import { generateId } from '#lib/id.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import * as v from 'valibot';
import { GroupReqSchema } from '#shared/apiContractSchema.js';
import { cleanTranslationPrefixes } from '#src/features/ai/safeText.js';

// --- Domain Logic (Internal Helpers) ---

const mapGroup = (item: Record<string, unknown>): ProductGroup => ({
  id: item.id as string,
  name: String(item.name || ''),
  description: (typeof item.description === 'object' && item.description !== null) 
    ? (item.description as { zh: string; en?: string; ms?: string }) 
    : { zh: String(item.description || '') },
  coverPhotoId: (item.coverPhotoId || item.cover_photo_id) as string,
  isHidden: (item.isHidden ?? item.is_hidden ?? false) as boolean,
  createdAt: (item.createdAt || item.created_at) as string,
  updatedAt: (item.updatedAt || item.updated_at) as string,
  userId: (item.userId || item.user_id) as string,
  status: item.status as 'confirmed' | 'active' | 'rejected',
  metadata: (item.metadata || {}) as Record<string, unknown>,
});

const mapToDb = (updates: Record<string, unknown>, userId?: string): Record<string, unknown> => {
  const dbUpdates: Record<string, unknown> = { ...updates };
  dbUpdates.updated_at = new Date().toISOString();
  if (userId) dbUpdates.user_id = userId;

  if ('name' in dbUpdates) {
    const val = dbUpdates.name;
    if (typeof val === 'string') {
      dbUpdates.name = cleanTranslationPrefixes(val).trim();
    } else if (val && typeof val === 'object') {
      const nameObj = val as Record<string, unknown>;
      dbUpdates.name = cleanTranslationPrefixes(String(nameObj.en || nameObj.zh || nameObj.ms || '')).trim();
    }
  }

  if ('description' in dbUpdates) {
    const val = dbUpdates.description;
    if (typeof val === 'string') dbUpdates.description = { zh: val };
  }

  return dbUpdates;
};

// --- API Service Logic ---

export const GroupService = {
  getById: async (id: string, _mode: 'public' | 'admin' = 'public'): Promise<ProductGroup | null> => {
    try {
      const data = await ErrorFactory.unwrap<Record<string, unknown> | null>(
        api.groups[':id'].$get({ param: { id } }),
        'Get group by id failed'
      );
      return data ? mapGroup(data) : null;
    } catch {
      return null;
    }
  },

  create: async (data: Partial<ProductGroup> & { name: string | Record<string, string> }): Promise<ProductGroup> => {
    v.parse(v.partial(GroupReqSchema), data);
    const { data: { user } } = await supabase.auth.getUser();
    const dbData = mapToDb(data as unknown as Record<string, unknown>, user?.id);
    
    return ErrorFactory.unwrap<ProductGroup>(
      api.groups.$post({ json: { groupData: dbData } }),
      'Create group failed'
    );
  },

  update: async (id: string, updates: Partial<ProductGroup>): Promise<ProductGroup> => {
    const { data: { user } } = await supabase.auth.getUser();
    const dbUpdates = mapToDb(updates as unknown as Record<string, unknown>, user?.id);
    v.parse(v.partial(GroupReqSchema), { ...dbUpdates, id });

    return ErrorFactory.unwrap<ProductGroup>(
      api.groups[':id'].$put({ param: { id }, json: { updates: dbUpdates } }),
      'Update group failed'
    );
  },

  upsert: async (group: Partial<ProductGroup> & { id: string }): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    const dbUpdates = mapToDb(group as unknown as Record<string, unknown>, user?.id);
    await ErrorFactory.unwrap<void>(
      api.groups.upsert.$post({ json: dbUpdates }),
      'Upsert group failed'
    );
  },

  delete: async (id: string): Promise<void> => {
    await ErrorFactory.unwrap<void>(api.groups.ungroup.$post({ json: { groupId: id } }), 'Ungroup failed');
    await ErrorFactory.unwrap<void>(api.groups[':id'].$delete({ param: { id } }), 'Delete group failed');
  },

  groupPhotos: async (photoIds: string[], targetGroupId?: string): Promise<{ newGroupId: string }> => {
    const id = targetGroupId || generateId();
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || 'staff';

    await ErrorFactory.unwrap(
      api.groups['group-photos'].$post({
        json: {
          targetGroupId: id,
          userId,
          photoIds,
          groupData: { id, name: 'GROUP', status: 'active' as const }
        }
      }),
      '分组照片失败'
    );
    return { newGroupId: id };
  },

  movePhotos: async (photoIds: string[], targetGroupId: string): Promise<void> => {
    await ErrorFactory.unwrap<void>(
      api.groups['move-photos'].$post({ json: { photoIds, targetGroupId } }),
      'Move photos failed'
    );
  },

  removePhotos: async (photoIds: string[], groupId: string): Promise<void> => {
    await ErrorFactory.unwrap<void>(
      api.groups['remove-photos'].$post({ json: { photoIds, groupId } }),
      'Remove photos from group failed'
    );
  },

  setCover: async (photoId: string | null, groupId: string): Promise<void> => {
    await ErrorFactory.unwrap<void>(
      api.groups['set-cover'].$post({ json: { photoId, groupId } }),
      'Set photo cover failed'
    );
  },

  ungroup: async (groupId: string): Promise<void> => {
    await ErrorFactory.unwrap<void>(
      api.groups.ungroup.$post({ json: { groupId } }),
      'Ungroup failed'
    );
  }
};
