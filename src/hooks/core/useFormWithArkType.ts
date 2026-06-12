import { useForm, UseFormProps } from 'react-hook-form';
import { arktypeResolver } from '@hookform/resolvers/arktype';
import { type } from 'arktype';

export const useFormWithArkType = <T extends Record<string, any>>(
  schema: ReturnType<typeof type>,
  defaultValues: T,
  options?: UseFormProps<T>
) => {
  return useForm<T>({
    resolver: arktypeResolver(schema as any),
    defaultValues: defaultValues as any,
    mode: 'onChange',
    ...options
  });
};
