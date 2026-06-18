import { useForm, UseFormProps, UseFormReturn } from 'react-hook-form';
import { arktypeResolver } from '@hookform/resolvers/arktype';
import { type, Type } from 'arktype';

export interface FormConfig<T extends Record<string, any>> {
  name: string;
  schema: Type;
  defaultValues: T;
  options?: Omit<UseFormProps<T>, 'resolver' | 'defaultValues'>;
}

/**
 * Centered Form Factory to satisfy Rule 3 of "四大工廠規範（鎖定）".
 * Form Factory MUST use centralized schemas and provide a unified API.
 */
export function defineForm<T extends Record<string, any>>(config: FormConfig<T>) {
  return function useFormInstance(
    options?: Partial<UseFormProps<T>>
  ): UseFormReturn<T> {
    const errorPrefix = `[Form Validation Contract Violated] Form "${config.name}"`;
    
    // Check initial default values against schema in development
    if (process.env.NODE_ENV !== 'production' && config.schema) {
      const check = config.schema(config.defaultValues);
      if (check instanceof type.errors) {
        console.warn(`${errorPrefix} default values violate schema:`, check.summary);
      }
    }

    return useForm<T>({
      resolver: arktypeResolver(config.schema as any),
      defaultValues: config.defaultValues as any,
      mode: 'onChange',
      ...config.options,
      ...options,
    });
  };
}
