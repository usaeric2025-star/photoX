import React from 'react';
import { useField } from '@tanstack/react-form';
import { cn } from '@/lib/utils';

interface AppFieldProps {
    form: any;
    name: string;
    label?: string;
    children: (field: any) => React.ReactNode;
    className?: string;
}

export function AppField({ form, name, label, children, className }: AppFieldProps) {
    return (
        <form.Field name={name}>
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
        </form.Field>
    );
}
