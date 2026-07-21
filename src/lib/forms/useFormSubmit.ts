import { useState } from 'react';
import { feedback } from '#lib/feedback.js';
import * as v from 'valibot';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';

interface UseFormSubmitOptions<T extends v.GenericSchema, R = void> {
    schema?: T;
    mutationFn: (values: v.InferOutput<T>) => Promise<R>;
    onSuccess?: (result: R) => void;
    onError?: (error: unknown) => void;
    successMessage?: string;
    errorMessage?: string;
}

export function useFormSubmit<T extends v.GenericSchema, R = void>({
    schema,
    mutationFn,
    onSuccess,
    onError,
    successMessage,
    errorMessage
}: UseFormSubmitOptions<T, R>) {
    const [isLoading, setIsLoading] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const clearFieldError = (name: string) => {
        setFieldErrors(prev => {
            const next = { ...prev };
            delete next[name];
            return next;
        });
    };

    const submit = async (values: unknown) => {
        if (isLoading) return;
        setIsLoading(true);
        setFieldErrors({});
        
        try {
            let parsedValues = values as v.InferOutput<T>;
            if (schema) {
                const result = v.safeParse(schema, values);
                if (!result.success) {
                    const errors: Record<string, string> = {};
                    result.issues.forEach(issue => {
                        if (issue.path?.[0]?.key) {
                            errors[issue.path[0].key as string] = issue.message;
                        }
                    });
                    setFieldErrors(errors);
                    setIsLoading(false);
                    return;
                }
                parsedValues = result.output;
            }

            const result = await mutationFn(parsedValues);
            
            if (successMessage) {
                feedback.success(successMessage);
            }
            onSuccess?.(result);
        } catch (error) {
            if (errorMessage) {
                ErrorFactory.handle(error, { context: 'form-submit', silent: true });
                feedback.error(errorMessage);
            } else {
                ErrorFactory.handle(error, { context: 'form-submit' });
            }
            onError?.(error);
        } finally {
            setIsLoading(false);
        }
    };

    return { submit, isLoading, fieldErrors, clearFieldError };
}
