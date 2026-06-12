import { useFormWithArkType } from './useFormWithArkType';
import { handleError } from '@/lib/error/errorHandler';
import { UseMutationResult } from '@tanstack/react-query';
import { type } from 'arktype';

export const useFormWithMutation = <T extends Record<string, any>>(
  schema: ReturnType<typeof type>,
  defaultValues: T,
  mutation: UseMutationResult<any, Error, any>,
  options?: any
) => {
  const form = useFormWithArkType<T>(schema, defaultValues, options);
  
  const save = form.handleSubmit(async (data) => {
    try {
      // If the mutation variables expect { id, updates } and data is flat
      if (data.id && !('updates' in data)) {
        const { id, ...updates } = data;
        await mutation.mutateAsync({ id, updates });
      } else {
        await mutation.mutateAsync(data as any);
      }
    } catch (error) {
      handleError(error, 'form.submit');
    }
  });
  
  return { 
    ...form, 
    save, 
    isPending: mutation.isPending 
  };
};
