import { useForm, FormApi } from '@tanstack/react-form';
import { valibotValidator } from '@tanstack/valibot-form-adapter';
import * as v from 'valibot';
import React from 'react';

interface UseAppFormOptions<T extends v.BaseSchema<any, any, any>> {
  schema: T;
  defaultValues: v.InferInput<T>;
  onSubmit: (data: v.InferOutput<T>) => Promise<void> | void;
  onValueChange?: (data: v.InferOutput<T>) => void;
}

export function useAppForm<T extends v.BaseSchema<any, any, any>>({
  schema,
  defaultValues,
  onSubmit,
  onValueChange,
}: UseAppFormOptions<T>) {
  const form = useForm({
    defaultValues,
    validators: {
      onChange: valibotValidator(schema as any),
    },
    onSubmit: async ({ value }) => {
      await onSubmit(value as v.InferOutput<T>);
    },
  });

  // Sync default values when they change
  React.useEffect(() => {
    form.reset();
  }, [form, defaultValues]);

  // Watch for value changes and trigger callback
  React.useEffect(() => {
    const unsubscribe: any = form.store.subscribe((state: any) => {
      if (onValueChange) {
        onValueChange(state.values as v.InferOutput<T>);
      }
    });
    
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      } else if (unsubscribe && typeof unsubscribe.unsubscribe === 'function') {
        unsubscribe.unsubscribe();
      }
    };
  }, [form, onValueChange]);

  return {
    form,
    // Alias to maintain compatibility during migration
    updateInput: (path: string[], value: any) => form.setFieldValue(path.join('.') as any, value),
    submit: form.handleSubmit,
  };
}

export function createFieldPath<T extends [string, ...string[]]>(path: T): T {
  return path;
}
