import React from 'react';
import { cn } from '#lib/utils.js';

import { FieldApi } from '@tanstack/react-form';

interface AppFieldProps<TData, TName extends string> {
    form: { Field: React.ComponentType<any> };
    name: TName;
    label?: string;
    children: (field: any) => React.ReactNode;
    className?: string;
}

export function AppField<TData, TName extends string>({ form, name, label, children, className }: AppFieldProps<TData, TName>) {
    const Field = form.Field as React.ComponentType<any>;
    return (
        <Field 
            name={name}
        >
            {(field) => (
                <div className={cn("space-y-1.5", className)}>
                    {label && (
                        <label className="text-sm font-medium text-foreground/70">
                            {label}
                        </label>
                    )}
                    {children(field)}
                    {field.state.meta.errors.length > 0 && (
                        <p className="text-xs text-destructive">
                            {field.state.meta.errors[0]}
                        </p>
                    )}
                </div>
            )}
        </Field>
    );
}

