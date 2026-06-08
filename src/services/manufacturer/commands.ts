import { supabase } from '../../lib/supabase';
import { SubCategory as Manufacturer } from '../../types';
import { success } from '@/lib/error/ErrorFactory';
import { withErrorHandling } from '@/lib/error/wrapper';
import { DB_CONFIG } from '../../constants/config';
import type { AppResult } from '@/types/api';

const TABLE_NAME = 'manufacturers';

// ... (existing code again, will clean up)

export const clearManufacturerFromPhotos = async (mfrId: string): Promise<AppResult<string[]>> => {
  return withErrorHandling(async () => {
    const { data, error } = await supabase
      .from(DB_CONFIG.TABLE_NAME)
      .update({ manufacturer_id: null })
      .eq('manufacturer_id', mfrId)
      .select('id');
    if (error) throw error;
    return data?.map(i => i.id) || [];
  }, 'clearManufacturerFromPhotos');
};
const ALLOWED_FIELDS = ['id', 'name', 'aliases'];
const NEVER_ALLOWED = ['isAnalyzing', 'exif_data', 'is_hidden', 'tempId', 'isSelected', 'isDragging', 'rawResponse'];

const mapToDb = (updates: Partial<Manufacturer> & Record<string, unknown>): Record<string, unknown> => {
    const dbUpdates: Record<string, unknown> = {};

    for (const key of ALLOWED_FIELDS) {
        if (key in updates && !NEVER_ALLOWED.includes(key)) {
            if (key === 'name' && typeof updates[key] === 'string') {
              dbUpdates[key] = (updates[key] as string).toUpperCase();
            } else {
              dbUpdates[key] = updates[key];
            }
        }
    }

    return dbUpdates;
};

export const updateManufacturer = async (id: string, updates: Partial<Manufacturer>): Promise<AppResult<void>> => {
    return withErrorHandling(async () => {
        const dbUpdates = mapToDb(updates);
        const { error } = await supabase
            .from(TABLE_NAME)
            .update(dbUpdates)
            .eq('id', id);
        if (error) throw error;
    }, 'updateManufacturer');
};

export const createManufacturer = async (data: Omit<Manufacturer, 'id'>): Promise<AppResult<Manufacturer>> => {
    return withErrorHandling(async () => {
        const dbUpdates = mapToDb(data as any);
        const { error, data: inserted } = await supabase
            .from(TABLE_NAME)
            .insert(dbUpdates)
            .select()
            .single();
        if (error) throw error;
        return inserted as Manufacturer;
    }, 'createManufacturer');
};

export const deleteManufacturer = async (id: string): Promise<AppResult<void>> => {
    return withErrorHandling(async () => {
        const { error } = await supabase
            .from(TABLE_NAME)
            .delete()
            .eq('id', id);
        if (error) throw error;
    }, 'deleteManufacturer');
};

export const addManufacturerToDB = async (name: string): Promise<Manufacturer | null> => {
  const result = await createManufacturer({ name, aliases: [] } as any);
  return result.ok ? result.data : null;
};

export const updateManufacturerInDB = async (id: string, updates: Partial<Manufacturer>): Promise<boolean> => {
  const result = await updateManufacturer(id, updates);
  return result.ok;
};

export const deleteManufacturerFromDB = async (id: string): Promise<boolean> => {
  const result = await deleteManufacturer(id);
  return result.ok;
};
