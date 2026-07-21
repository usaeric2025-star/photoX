import { useForm } from '@tanstack/react-form';
import * as v from 'valibot';

interface UseAppFormOptions<TData> {
    schema?: v.GenericSchema | v.GenericSchemaAsync;
    defaultValues: TData;
    onSubmit: (values: TData) => Promise<void> | void;
    onValueChange?: (values: TData) => void;
}

export function useAppForm<TData>({
    schema,
    defaultValues,
    onSubmit,
    onValueChange
}: UseAppFormOptions<TData>) {
    const form = useForm({
        defaultValues: defaultValues as any,
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
            await onSubmit(value as TData);
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
