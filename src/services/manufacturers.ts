import { supabase } from '../lib/supabase';
import { SubCategory as Manufacturer } from '../types';

const TABLE_NAME = 'manufacturers';

const ALLOWED_FIELDS = ['id', 'name', 'aliases'];
const NEVER_ALLOWED = ['isAnalyzing', 'exif_data', 'is_hidden', 'tempId', 'isSelected', 'isDragging', 'rawResponse'];

const FIELD_MAP: Record<string, string> = {
};

const mapToDb = (updates: Partial<Manufacturer> & Record<string, unknown>, isCreate = false): Record<string, unknown> => {
    const dbUpdates: Record<string, unknown> = {};

    // Filter
    for (const key of ALLOWED_FIELDS) {
        if (key in updates && !NEVER_ALLOWED.includes(key)) {
            const dbKey = FIELD_MAP[key] || key;
            if (key === 'name' && typeof updates[key] === 'string') {
              dbUpdates[dbKey] = (updates[key] as string).toUpperCase();
            } else {
              dbUpdates[dbKey] = updates[key];
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

// 加载所有厂商
export const loadManufacturersFromCloud = async (): Promise<Manufacturer[]> => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .order('name', { ascending: true });
  if (error) {
    return [];
  }
  const result = (data || []).map((m: any) => ({
    ...m,
    id: String(m.id)
  }));
  return result;
};

// 新增厂商
export const addManufacturerToDB = async (name: string): Promise<Manufacturer> => {
  const data = await createManufacturer({ name, aliases: [] } as unknown as Manufacturer);
  return { ...data, id: String(data.id) } as Manufacturer;
};

// 更新厂商
export const updateManufacturerInDB = async (id: string, updates: Partial<Manufacturer>) => {
  await updateManufacturer(id, updates);
  return true;
};

// 删除厂商
export const deleteManufacturerFromDB = async (id: string) => {
  await deleteManufacturer(id);
  return true;
};
