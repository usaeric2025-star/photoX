import React from 'react';
import { cn } from '#lib/utils.js';

interface AppFieldProps<TName extends string> {
    form: { Field: React.ComponentType<{ name: TName; children: (field: { state: { value: any; meta: { errors: any[] } }; handleChange: (val: any) => void }) => React.ReactNode }> };
    name: TName;
    label?: string;
    children: (field: { state: { value: any; meta: { errors: any[] } }; handleChange: (val: any) => void }) => React.ReactNode;
    className?: string;
}

function AppField<TName extends string>({ form, name, label, children, className }: AppFieldProps<TName>) {
    const Field = form.Field as React.ComponentType<{ name: TName; children: (field: { state: { value: any; meta: { errors: any[] } }; handleChange: (val: any) => void }) => React.ReactNode }>;
    return (
        <Field 
            name={name}
        >
            {(field: { state: { value: any; meta: { errors: any[] } }; handleChange: (val: any) => void }) => (
                <div className={cn("space-y-1.5", className)}>
                    {label && (
                        <label className="text-sm font-medium text-foreground/70">
                            {label}
                        </label>
                    )}
                    {children(field)}
                    {field.state.meta.errors.length > 0 && (
                        <p className="text-xs text-destructive">
                            {field.state.meta.errors[0] as React.ReactNode}
                        </p>
                    )}
                </div>
            )}
        </Field>
    );
}
