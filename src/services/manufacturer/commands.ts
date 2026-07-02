import { api } from '#lib/api.js';
import { Manufacturer } from '#src/types/index.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';

const clearManufacturerFromPhotos = async (mfrId: string): Promise<string[]> => {
  const res = await api.manufacturers['clear-photos'].$post({
    json: { manufacturerId: mfrId }
  });
  if (!res.ok) throw ErrorFactory.fatal('Clear manufacturer photos failed', { context: 'clearManufacturerFromPhotos' });
  const { data } = await res.json() as Record<string, unknown>;
  const d = data as { success: boolean, data?: string[] } | undefined;
  return d?.data || [];
};

const updateManufacturer = async (id: string, updates: Partial<Manufacturer>): Promise<void> => {
  const res = await api.manufacturers[':id'].$put({
    param: { id },
    json: { updates: { name: (updates.name || '').toUpperCase() } }
  });
  if (!res.ok) throw ErrorFactory.fatal('Update manufacturer failed', { context: 'updateManufacturer' });
};

const createManufacturer = async (data: Omit<Manufacturer, 'id' | 'created_at' | 'updated_at'>): Promise<Manufacturer> => {
  const res = await api.manufacturers.$post({
    json: { manufacturerData: { name: (data.name || '').toUpperCase() } }
  });
  if (!res.ok) throw ErrorFactory.fatal('Create manufacturer failed', { context: 'createManufacturer' });
  const result = await res.json() as Record<string, unknown>;
  return result.data as Manufacturer;
};

const deleteManufacturer = async (id: string): Promise<void> => {
  const res = await api.manufacturers[':id'].$delete({
    param: { id }
  });
  if (!res.ok) throw ErrorFactory.fatal('Delete manufacturer failed', { context: 'deleteManufacturer' });
};

export const addManufacturerToDB = async (name: string): Promise<Manufacturer | null> => {
  try {
    return await createManufacturer({ name, aliases: [] } as unknown as Omit<Manufacturer, 'id' | 'created_at' | 'updated_at'>);
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
