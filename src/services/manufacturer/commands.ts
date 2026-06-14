import { supabase } from '../../lib/supabase';
import { SubCategory as Manufacturer } from '../../types';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { DB_CONFIG } from '../../constants/config';

const TABLE_NAME = 'manufacturers';

// ... (existing code again, will clean up)

export const clearManufacturerFromPhotos = async (mfrId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from(DB_CONFIG.TABLE_NAME)
    .update({ manufacturer_id: null })
    .eq('manufacturer_id', mfrId)
    .select('id');
  if (error) throw ErrorFactory.fatal(error.message, { context: 'clearManufacturerFromPhotos' });
  return data?.map(i => i.id) || [];
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

export const updateManufacturer = async (id: string, updates: Partial<Manufacturer>): Promise<void> => {
  const dbUpdates = mapToDb(updates);
  const { error } = await supabase
      .from(TABLE_NAME)
      .update(dbUpdates)
      .eq('id', id);
  if (error) throw ErrorFactory.fatal(error.message, { context: 'updateManufacturer' });
};

export const createManufacturer = async (data: Omit<Manufacturer, 'id'>): Promise<Manufacturer> => {
  const dbUpdates = mapToDb(data as any);
  const { error, data: inserted } = await supabase
      .from(TABLE_NAME)
      .insert(dbUpdates)
      .select()
      .single();
  if (error) throw ErrorFactory.fatal(error.message, { context: 'createManufacturer' });
  return inserted as Manufacturer;
};

export const deleteManufacturer = async (id: string): Promise<void> => {
  const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', id);
  if (error) throw ErrorFactory.fatal(error.message, { context: 'deleteManufacturer' });
};

export const addManufacturerToDB = async (name: string): Promise<Manufacturer | null> => {
  try {
    return await createManufacturer({ name, aliases: [] } as any);
  } catch(e) {
    return null;
  }
};

export const updateManufacturerInDB = async (id: string, updates: Partial<Manufacturer>): Promise<boolean> => {
  try {
    await updateManufacturer(id, updates);
    return true;
  } catch {
    return false;
  }
};

export const deleteManufacturerFromDB = async (id: string): Promise<boolean> => {
  try {
    await deleteManufacturer(id);
    return true;
  } catch {
    return false;
  }
};
