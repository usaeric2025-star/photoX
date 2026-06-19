import React from 'react';
import { AutoForm as ElAutoForm, AutoFormFieldConfig } from 'el-form-react-components';
import { arktypeToElForm } from '@/lib/form/elFormAdapter';
import type { Type } from 'arktype';

interface AutoFormProps<T extends Record<string, any>> {
  schema: Type<T>;
  defaultValues?: Partial<T>;
  onSubmit: (data: T) => void | Promise<void>;
  className?: string;
  fields?: AutoFormFieldConfig[];
}

export function AutoForm<T extends Record<string, any>>({
  schema,
  defaultValues,
  onSubmit,
  className,
  fields,
}: AutoFormProps<T>) {
  const generatedFields = arktypeToElForm(schema);
  const activeFields = fields || generatedFields;
  
  return (
    <ElAutoForm
      // @ts-ignore: ElAutoForm types zod but accepts arktype
      schema={schema}
      fields={activeFields}
      initialValues={defaultValues}
      onSubmit={onSubmit}
    />
  );
}
