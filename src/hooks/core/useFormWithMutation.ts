import { useFormWithArkType } from './useFormWithArkType';
import { handleError } from '@/lib/error/errorHandler';
import { UseMutationResult } from '@tanstack/react-query';
import { type } from 'arktype';

export const useFormWithMutation = <T extends Record<string, any>>(
  schema: ReturnType<typeof type>,
  defaultValues: T,
  mutation: UseMutationResult<any, Error, T>
) => {
  const form = useFormWithArkType<T>(schema, defaultValues);
  
  const save = form.handleSubmit(async (data) => {
    try {
      await mutation.mutateAsync(data as any);
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
