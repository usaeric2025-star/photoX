import React from 'react';
import { cn } from '#lib/utils.js';

interface AppFieldProps<TName extends string> {
    form: { Field: React.ComponentType<any> };
    name: TName;
    label?: string;
    children: (field: any) => React.ReactNode;
    className?: string;
}

export function AppField<TName extends string>({ form, name, label, children, className }: AppFieldProps<TName>) {
    const Field = form.Field as React.ComponentType<any>;
    return (
        <Field 
            name={name}
        >
            {(field: any) => (
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
