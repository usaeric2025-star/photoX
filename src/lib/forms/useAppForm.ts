import { useForm } from '@tanstack/react-form';
import { valibotValidator } from '@tanstack/valibot-form-adapter';
import type * as v from 'valibot';

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
        defaultValues,
        validators: {
            onChange: schema as never,
        },
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
