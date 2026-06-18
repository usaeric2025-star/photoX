import { api } from '@/lib/api';
import { SubCategory as Manufacturer } from '../../types';
import { ErrorFactory } from '@/lib/error/ErrorFactory';

export const clearManufacturerFromPhotos = async (mfrId: string): Promise<string[]> => {
  const res = await api.manufacturers['clear-photos'].$post({
    json: { manufacturerId: mfrId }
  });
  if (!res.ok) throw ErrorFactory.fatal('Clear manufacturer photos failed', { context: 'clearManufacturerFromPhotos' });
  const { data } = await res.json();
  const d = data as { success: boolean, data: string[] };
  return (d as any).data || [];
};

export const updateManufacturer = async (id: string, updates: Partial<Manufacturer>): Promise<void> => {
  const res = await api.manufacturers[':id'].$put({
    param: { id },
    json: { updates: { name: (updates.name || '').toUpperCase() } }
  });
  if (!res.ok) throw ErrorFactory.fatal('Update manufacturer failed', { context: 'updateManufacturer' });
};

export const createManufacturer = async (data: Omit<Manufacturer, 'id'>): Promise<Manufacturer> => {
  const res = await api.manufacturers.$post({
    json: { manufacturerData: { name: (data.name || '').toUpperCase() } }
  });
  if (!res.ok) throw ErrorFactory.fatal('Create manufacturer failed', { context: 'createManufacturer' });
  const result = await res.json() as any;
  return result.data as Manufacturer;
};

export const deleteManufacturer = async (id: string): Promise<void> => {
  const res = await api.manufacturers[':id'].$delete({
    param: { id }
  });
  if (!res.ok) throw ErrorFactory.fatal('Delete manufacturer failed', { context: 'deleteManufacturer' });
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
