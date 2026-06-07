import { errorFactory, success, fromThrowableAsync } from '@/lib/error/ErrorFactory';
import type { AppResult } from '@/types/api';
import { supabase } from '../../lib/supabase';
import { ProductGroup } from '../../types';
import { createGroupValidator } from '../../lib/validators/factory';
import { cleanTranslationPrefixes } from '@/lib/ai/safeText';

/**
 * Consolidating all group mutation logic here.
 */

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
    const validator = createGroupValidator();
    const validationRes = validator.validate(data);
    if (!validationRes.ok) return validationRes as AppResult<ProductGroup>;

    const userId = await getCurrentUserId();
    const dbData = mapToDb(data as any, userId);
    
    const { error, data: inserted } = await supabase
        .from(TABLE_NAME)
        .insert(dbData)
        .select()
        .single();

    if (error) return errorFactory(error.message, 'DB_ERROR', 'createGroup', error);
    return success(inserted);
}

export async function updateGroup(id: string, updates: Partial<ProductGroup>): Promise<AppResult<ProductGroup>> {
    const validator = createGroupValidator();
    const validationRes = validator.validate(updates);
    if (!validationRes.ok) return validationRes as AppResult<ProductGroup>;

    const userId = await getCurrentUserId();
    const dbUpdates = mapToDb(updates, userId);
    
    const { error, data: updated } = await supabase
        .from(TABLE_NAME)
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

    if (error) return errorFactory(error.message, 'DB_ERROR', 'updateGroup', error);
    return success(updated);
}

export async function upsertGroup(group: Partial<ProductGroup> & { id: string }): Promise<AppResult<void>> {
    const userId = await getCurrentUserId();
    const dbUpdates = mapToDb(group, userId);
    const { error } = await supabase
        .from(TABLE_NAME)
        .upsert(dbUpdates, { onConflict: 'id' });

    if (error) return errorFactory(error.message, 'DB_ERROR', 'upsertGroup', error);
    return success(undefined);
}

export async function deleteGroup(id: string): Promise<AppResult<void>> {
    const userId = await getCurrentUserId();
    let query = supabase.from(TABLE_NAME).delete().eq('id', id);
    if (userId) query = query.eq('user_id', userId);
    
    const { error } = await query;
    if (error) return errorFactory(error.message, 'DB_ERROR', 'deleteGroup', error);
    return success(undefined);
}

// Action aliases for legacy or specific naming compliance
export const createGroupAction = createGroup;
export const updateGroupAction = updateGroup;
export const saveGroup = upsertGroup;
export const deleteGroupFromCloud = deleteGroup;
