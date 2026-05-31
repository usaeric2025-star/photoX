import { supabase } from '../../lib/supabase';
import { SubCategory as Manufacturer } from '../../types';

const TABLE_NAME = 'manufacturers';
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
    const dbUpdates = mapToDb(data as any);
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

export const addManufacturerToDB = async (name: string): Promise<Manufacturer> => {
  const data = await createManufacturer({ name, aliases: [] } as unknown as Manufacturer);
  return { ...data, id: String(data.id) } as Manufacturer;
};

export const updateManufacturerInDB = async (id: string, updates: Partial<Manufacturer>) => {
  await updateManufacturer(id, updates);
  return true;
};

export const deleteManufacturerFromDB = async (id: string) => {
  await deleteManufacturer(id);
  return true;
};
