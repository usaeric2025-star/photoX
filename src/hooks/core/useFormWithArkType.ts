import { useForm, UseFormProps, FieldValues, DefaultValues } from "react-hook-form";
import { arktypeResolver } from '@hookform/resolvers/arktype';
import { type } from 'arktype';

export const useFormWithArkType = <T extends FieldValues>(
  schema: ReturnType<typeof type>,
  defaultValues: DefaultValues<T>,
  options?: UseFormProps<T>
) => {
  return useForm<T>({
    resolver: arktypeResolver(schema as any) as any,
    defaultValues: defaultValues,
    mode: 'onChange',
    ...options
  });
};
