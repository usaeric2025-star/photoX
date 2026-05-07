import { supabase } from '../lib/supabase';
import { ProductGroup } from '../types';

const TABLE_NAME = 'groups';

const ALLOWED_FIELDS = [
    'id', 'name', 'description', 'description_translations', 'colors', 'materials',
    'coverPhotoId', 'userId', 'isHidden', 'createdAt', 'updatedAt',
    'cover_photo_id', 'user_id', 'is_hidden', 'created_at', 'updated_at'
];

const FIELD_MAP: Record<string, string> = {
    coverPhotoId: 'cover_photo_id',
    userId: 'user_id',
    isHidden: 'is_hidden',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
};

const mapToDb = (updates: Partial<ProductGroup> & Record<string, any>, isCreate = false, userId?: string): Record<string, any> => {
    const dbUpdates: any = {};

    // Filter
    for (const key of ALLOWED_FIELDS) {
        if (key in updates) {
            const dbKey = FIELD_MAP[key] || key;
            dbUpdates[dbKey] = updates[key];
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
        console.error("Failed to update group:", error);
        throw new Error(error.message);
    }
};

export const upsertGroup = async (group: Partial<ProductGroup> & { id: string }) => {
    const userId = await getCurrentUserId();
    const dbUpdates = mapToDb(group, false, userId);
    const { error } = await supabase
        .from(TABLE_NAME)
        .upsert(dbUpdates, { onConflict: 'id' });

    if (error) {
        console.error("Failed to upsert group:", error);
        throw new Error(error.message);
    }
};

export const createGroup = async (groupData: ProductGroup) => {
    const userId = await getCurrentUserId();
    const dbUpdates = mapToDb(groupData, true, userId);
    const { error, data } = await supabase
        .from(TABLE_NAME)
        .insert(dbUpdates)
        .select()
        .single();

    if (error) {
        console.error("Failed to create group:", error);
        throw new Error(error.message);
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
        console.error(`Failed to delete group ${id}:`, error);
        throw new Error(error.message);
    }
};
