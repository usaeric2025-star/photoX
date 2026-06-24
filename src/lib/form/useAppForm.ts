import { useForm } from '@tanstack/react-form';
import { valibotValidator } from '@tanstack/valibot-form-adapter';
import * as v from 'valibot';
import React from 'react';
import { showToast } from '@/lib/ui/toast';

interface UseAppFormOptions<T extends v.GenericSchema> {
  schema: T;
  defaultValues: v.InferInput<T>;
  onSubmit: (data: v.InferOutput<T>) => Promise<void> | void;
  onValueChange?: (data: v.InferOutput<T>) => void;
}

export function useAppForm<T extends v.GenericSchema>({
  schema,
  defaultValues,
  onSubmit,
  onValueChange,
}: UseAppFormOptions<T>) {
  const form = useForm({
    defaultValues,
    validators: {
      onChange: valibotValidator(schema as never),
    },
    onSubmit: async ({ value }) => {
      await onSubmit(value as v.InferOutput<T>);
    },
  });

  // Sync default values when they change
  React.useEffect(() => {
    // Pass the new defaultValues to reset so the form internal state updates properly.
    // If the form is already dirty, we only update the defaultValues behind the scenes
    // without wiping out the user's uncommitted changes.
    const keepState = form.state.isDirty || form.state.isTouched;
    if (!keepState) {
      // @ts-expect-error tanstack form types
      form.reset(defaultValues);
    } else {
      form.update({ defaultValues });
    }
  }, [form, defaultValues]);

  // Watch for value changes and trigger callback
  React.useEffect(() => {
    const unsubscribe = form.store.subscribe((state) => {
      if (onValueChange) {
        onValueChange(state.values as v.InferOutput<T>);
      }
    });
    
    return () => {
      if (typeof unsubscribe === 'function') {
        (unsubscribe as () => void)();
      }
    };
  }, [form, onValueChange]);

  const submitWithValidation = async () => {
    // Manual validation with Valibot to trigger Toast
    const check = v.safeParse(schema, form.state.values);
    if (!check.success) {
      showToast.error('請檢查表單欄位，紅框標記處為必填或格式不正確');
      // Still trigger form's own validation to update UI (show red borders etc)
      await form.validateAllFields('submit');
      return;
    }
    return await form.handleSubmit();
  };

  return {
    form,
    // Alias to maintain compatibility during migration
    updateInput: (path: string[], value: unknown) => form.setFieldValue(path.join('.') as never, value as never),
    submit: submitWithValidation,
  };
}

export function createFieldPath<T extends [string, ...string[]]>(path: T): T {
  return path;
}
