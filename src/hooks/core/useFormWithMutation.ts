import { useFormWithArkType } from './useFormWithArkType';
import { ErrorFactory, handleError } from '@/lib/error/ErrorFactory';
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
      const wrapped = ErrorFactory.wrap(error, 'form.submit');
      handleError(wrapped, 'form.submit', false);
    }
  });
  
  return { 
    ...form, 
    save, 
    isPending: mutation.isPending 
  };
};
