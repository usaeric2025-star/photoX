import { supabase } from '../lib/supabase';
import { ProductGroup } from '../types';
import { globalHandleError } from '../utils/errorHandler';

const TABLE_NAME = 'groups';

const ALLOWED_FIELDS = [
    'id', 'name', 'description', 'description_translations', 'colors', 'materials',
    'is_hidden', 'cover_photo_id', 'user_id', 'created_at', 'updated_at'
];

const mapToDb = (updates: Partial<ProductGroup> & Record<string, unknown>, isCreate = false, userId?: string): Record<string, unknown> => {
    const dbUpdates: Record<string, unknown> = {};

    // Filter
    for (const key of ALLOWED_FIELDS) {
        if (key in updates) {
            dbUpdates[key] = updates[key];
        }
    }

    // Auto-timestamps
    dbUpdates.updated_at = new Date().toISOString();
    if (isCreate && !dbUpdates.created_at) {
        dbUpdates.created_at = new Date().toISOString();
    }
    
    // Explicitly set user_id if provided and not already set
    if (userId && !dbUpdates.user_id) {
        dbUpdates.user_id = userId;
    }

    return dbUpdates;
};

const getCurrentUserId = async (): Promise<string | undefined> => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id;
};

export const updateGroup = async (groupId: string, updates: Partial<ProductGroup>) => {
    const userId = await getCurrentUserId();
    const dbUpdates = mapToDb(updates, false, userId);
    const { error } = await supabase
        .from(TABLE_NAME)
        .update(dbUpdates)
        .eq('id', groupId);

    if (error) {
        globalHandleError(error, "Update Group", true);
        throw new Error(`Update Group Fail: ${error.message}`);
    }
};

export const upsertGroup = async (group: Partial<ProductGroup> & { id: string }) => {
    const userId = await getCurrentUserId();
    const dbUpdates = mapToDb(group, false, userId);
    const { error } = await supabase
        .from(TABLE_NAME)
        .upsert(dbUpdates, { onConflict: 'id' });

    if (error) {
        globalHandleError(error, "Upsert Group", true);
        throw new Error(`Upsert Group Fail: ${error.message}`);
    }
};

export const createGroup = async (groupData: ProductGroup) => {
    const userId = await getCurrentUserId();
    const dbUpdates = mapToDb(groupData as unknown as Record<string, unknown>, true, userId);
    const { error, data } = await supabase
        .from(TABLE_NAME)
        .insert(dbUpdates)
        .select()
        .single();

    if (error) {
        globalHandleError(error, "Create Group", true);
        throw new Error(`Create Group Fail: ${error.message}`);
    }
    return data;
};

export const deleteGroup = async (id: string, userId?: string) => {
    let query = supabase.from(TABLE_NAME).delete().eq('id', id);
    if (userId) {
        query = query.eq('user_id', userId);
    }
    const { error } = await query;
    if (error) {
        globalHandleError(error, `Delete Group ${id}`, true);
        throw new Error(`Delete Group Fail: ${error.message}`);
    }
};
