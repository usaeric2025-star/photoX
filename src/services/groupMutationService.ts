import { supabase } from '../lib/supabase';
import { ProductGroup } from '../types';
import { createGroupValidator } from '../lib/validators/factory';
import { isErr } from '@/lib/errorFactory';

/**
 * Service for all group-related write operations.
 * Adheres to PhotoX Coding Rules v2.0.
 */

const TABLE_NAME = 'groups';

const ALLOWED_FIELDS = [
    'id', 'name', 'description', 'description_translations', 'colors', 'materials',
    'is_hidden', 'cover_photo_id', 'user_id', 'created_at', 'updated_at'
];

const mapToDb = (updates: Partial<ProductGroup> & Record<string, unknown>, isCreate = false, userId?: string): Record<string, unknown> => {
    const dbUpdates: Record<string, unknown> = {};

    for (const key of ALLOWED_FIELDS) {
        if (key in updates) {
            const val = updates[key];
            if (key === 'user_id' && (val === '' || val === 'default' || !val)) {
                continue;
            }
            dbUpdates[key] = val;
        }
    }

    dbUpdates.updated_at = new Date().toISOString();
    if (isCreate && !dbUpdates.created_at) {
        dbUpdates.created_at = new Date().toISOString();
    }
    
    if (userId && (!dbUpdates.user_id || dbUpdates.user_id === 'default' || dbUpdates.user_id === '')) {
        dbUpdates.user_id = userId;
    }

    return dbUpdates;
};

const getCurrentUserId = async (): Promise<string | undefined> => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id;
};

export const updateGroupInCloud = async (groupId: string, updates: Partial<ProductGroup>) => {
    // [APF-CONTRACT] Validate updates
    const validator = createGroupValidator();
    const validationRes = validator.validate(updates);
    if (!validationRes.ok) {
        throw new Error(`Group Update Validation Failed: ${validationRes.message}.`);
    }

    const userId = await getCurrentUserId();
    const dbUpdates = mapToDb(updates, false, userId);
    const { error } = await supabase
        .from(TABLE_NAME)
        .update(dbUpdates)
        .eq('id', groupId);

    if (error) {
        throw new Error(`Update Group Fail: ${error.message}`);
    }
};

export const createGroupInCloud = async (groupData: ProductGroup) => {
    // [APF-CONTRACT] Validate groupData
    const validator = createGroupValidator();
    const validationRes = validator.validate(groupData);
    if (!validationRes.ok) {
        throw new Error(`Group Creation Validation Failed: ${validationRes.message}.`);
    }

    const userId = await getCurrentUserId();
    const dbUpdates = mapToDb(groupData as unknown as Record<string, unknown>, true, userId);
    const { error, data } = await supabase
        .from(TABLE_NAME)
        .insert(dbUpdates)
        .select()
        .single();

    if (error) {
        throw new Error(`Create Group Fail: ${error.message}`);
    }
    return data;
};

export const upsertGroupInCloud = async (group: Partial<ProductGroup> & { id: string }) => {
    const userId = await getCurrentUserId();
    const dbUpdates = mapToDb(group, false, userId);
    const { error } = await supabase
        .from(TABLE_NAME)
        .upsert(dbUpdates, { onConflict: 'id' });

    if (error) {
        throw new Error(`Upsert Group Fail: ${error.message}`);
    }
};

export const deleteGroupFromCloud = async (id: string, userId?: string) => {
    let query = supabase.from(TABLE_NAME).delete().eq('id', id);
    if (userId) {
        query = query.eq('user_id', userId);
    }
    const { error } = await query;
    if (error) {
        throw new Error(`Delete Group Fail: ${error.message}`);
    }
};

/**
 * [RED-LINE] Group Mutation Service singleton
 */
export const groupMutationService = {
  update: updateGroupInCloud,
  create: createGroupInCloud,
  upsert: upsertGroupInCloud,
  delete: deleteGroupFromCloud
};
