import { useManufacturers as useManufacturerService } from '@/services/manufacturer/manufacturerService';

export const useManufacturers = () => {
  const { manufacturers, isLoading, error, mutate } = useManufacturerService();
  return {
    data: manufacturers || [],
    isLoading,
    error,
    refetch: mutate,
  };
};
