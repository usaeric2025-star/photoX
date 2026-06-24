import { Field } from '@tanstack/react-form';
import { ReactNode } from 'react';
import { usePhotoEditSessionContext } from '@/hooks/photo';

interface AppFieldProps {
  name: string;
  label?: string;
  children: (props: {
    value: any;
    onChange: (value: any) => void;
    error?: string;
    isTouched?: boolean;
  }) => ReactNode;
}

export function AppField({ name, label, children }: AppFieldProps) {
  const { form } = usePhotoEditSessionContext();
  return (
    <Field form={form as any} name={name as any}>
      {(field) => (
        <div className="space-y-1">
          {label && <label className="block text-sm font-medium">{label}</label>}
          {children({
            value: field.state.value,
            onChange: field.handleChange,
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
