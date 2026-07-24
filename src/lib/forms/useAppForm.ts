import { useForm } from '@tanstack/react-form';
import * as v from 'valibot';

interface UseAppFormOptions<TData> {
    schema?: v.GenericSchema | v.GenericSchemaAsync;
    defaultValues: TData;
    onSubmit: (values: TData) => Promise<void> | void;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
    onValueChange?: (values: TData) => void;
}

export function useAppForm<TData>({
    schema,
    defaultValues,
    onSubmit,
    onSuccess,
    onError,
    onValueChange
}: UseAppFormOptions<TData>) {
    const form = useForm({
        defaultValues: defaultValues as TData & Record<string, unknown>,
        validators: schema ? {
            onChange: ({ value }) => {
                const result = v.safeParse(schema as v.GenericSchema, value);
                if (!result.success) {
                    return result.issues.map(i => i.message).join(', ');
                }
                return undefined;
            }
        } : undefined,
        onSubmit: async ({ value }) => {
            try {
                await onSubmit(value as TData);
                onSuccess?.();
            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                onError?.(err);
                throw err;
            }
        },
    });

    if (onValueChange) {
        form.store.subscribe((state) => {
            onValueChange(state.values as TData);
        });
    }

    return { 
        form,
        submit: form.handleSubmit
    };
}
