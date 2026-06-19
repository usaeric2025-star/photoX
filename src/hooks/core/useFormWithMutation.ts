import { useFormWithArkType } from './useFormWithArkType';
import { ErrorFactory, handleError } from '@/lib/error/ErrorFactory';
import { UseMutationResult } from '@tanstack/react-query';
import { type } from 'arktype';
import { FieldValues, UseFormProps, DefaultValues } from "react-hook-form";

export const useFormWithMutation = <T extends FieldValues, TData = unknown, TVariables = unknown>(
  schema: ReturnType<typeof type>,
  defaultValues: DefaultValues<T>,
  mutation: UseMutationResult<TData, Error, TVariables>,
  options?: UseFormProps<T>
) => {
  const form = useFormWithArkType<T>(schema, defaultValues, options);
  
  const save = form.handleSubmit(async (data) => {
    try {
      if (data.id && !('updates' in data)) {
        const { id, ...updates } = data;
        await mutation.mutateAsync({ id, updates } as unknown as TVariables);
      } else {
        await mutation.mutateAsync(data as unknown as TVariables);
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
