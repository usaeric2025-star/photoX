import { api } from '#lib/api';
import { Manufacturer } from '#src/types';

export const loadManufacturersFromCloud = async (): Promise<Manufacturer[]> => {
  const res = await api.manufacturers.$get();
  if (!res.ok) return [];
  const { data } = await res.json();
  
  const result = (data || []).map((m: unknown) => ({
    ...(m as Manufacturer),
    id: String((m as Manufacturer).id)
  }));
  return result;
};
