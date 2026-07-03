import React from 'react';
import { cn } from '#lib/utils.js';
import { FieldApi, FormApi } from '@tanstack/react-form';

interface AppFieldProps {
    form: FormApi<any, any>;
    name: string;
    label?: string;
    children: (field: FieldApi<any, any, any, any>) => React.ReactNode;
    className?: string;
}

export function AppField({ form, name, label, children, className }: AppFieldProps) {
    return (
        <form.Field 
            name={name}
        >
            {(field) => (
                <div className={cn("space-y-1.5", className)}>
                    {label && (
                        <label className="text-sm font-medium text-foreground/70">
                            {label}
                        </label>
                    )}
                    {children(field as FieldApi<any, any, any, any>)}
                    {field.state.meta.errors.length > 0 && (
                        <p className="text-xs text-destructive">
                            {field.state.meta.errors[0]}
                        </p>
                    )}
                </div>
            )}
        </form.Field>
    );
}
