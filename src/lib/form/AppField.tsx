import { Field } from '@tanstack/react-form';
import { ReactNode } from 'react';
import { usePhotoEditSessionContext } from '@/hooks/photo';

interface AppFieldProps<T = unknown> {
  name: string;
  label?: string;
  children: (props: {
    value: T;
    onChange: (value: T) => void;
    error?: string;
    isTouched?: boolean;
  }) => ReactNode;
}

export function AppField<T = unknown>({ name, label, children }: AppFieldProps<T>) {
  const { form } = usePhotoEditSessionContext();
  return (
    <Field form={form} name={name as never}>
      {(field) => (
        <div className="space-y-1">
          {label && <label className="block text-sm font-medium">{label}</label>}
          {children({
            value: field.state.value as T,
            onChange: (val: T) => field.handleChange(val as never),
            error: field.state.meta.errors?.[0] as string | undefined,
            isTouched: field.state.meta.isTouched,
          })}
          {field.state.meta.errors && field.state.meta.isTouched && (
            <p className="text-sm text-red-500">{field.state.meta.errors[0]}</p>
          )}
        </div>
      )}
    </Field>
  );
}
