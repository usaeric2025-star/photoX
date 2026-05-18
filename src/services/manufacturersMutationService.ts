import { supabase } from '../lib/supabase';
import { Manufacturer } from '../types';

const TABLE_NAME = 'manufacturers';

const ALLOWED_FIELDS = ['id', 'name', 'zh', 'en', 'ms', 'aliases'];
const NEVER_ALLOWED = ['isAnalyzing', 'exif_data', 'is_hidden', 'tempId', 'isSelected', 'isDragging', 'rawResponse'];

const FIELD_MAP: Record<string, string> = {
};

const mapToDb = (updates: Partial<Manufacturer> & Record<string, unknown>, isCreate = false): Record<string, unknown> => {
    const dbUpdates: Record<string, unknown> = {};

    // Filter
    for (const key of ALLOWED_FIELDS) {
        if (key in updates && !NEVER_ALLOWED.includes(key)) {
            const dbKey = FIELD_MAP[key] || key;
            dbUpdates[dbKey] = updates[key];
        }
    }

    return dbUpdates;
};

export const updateManufacturer = async (id: string, updates: Partial<Manufacturer>) => {
    const dbUpdates = mapToDb(updates);
    const { error } = await supabase
        .from(TABLE_NAME)
        .update(dbUpdates)
        .eq('id', id);

    if (error) {
        throw new Error(error.message);
    }
};

export const createManufacturer = async (data: Omit<Manufacturer, 'id'>) => {
    const dbUpdates = mapToDb(data, true);
    const { error, data: inserted } = await supabase
        .from(TABLE_NAME)
        .insert(dbUpdates)
        .select()
        .single();

    if (error) {
        throw new Error(error.message);
    }
    return inserted;
};

export const deleteManufacturer = async (id: string) => {
    const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id', id);
    if (error) {
        throw new Error(error.message);
    }
};
