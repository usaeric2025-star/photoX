import { useForm } from '@tanstack/react-form';

interface UseAppFormOptions<T> {
    schema: T;
    defaultValues: any;
    onSubmit: (values: any) => Promise<void> | void;
    onValueChange?: (values: any) => void;
}

export function useAppForm<T>({
    schema,
    defaultValues,
    onSubmit,
    onValueChange
}: UseAppFormOptions<T>) {
    const form = useForm({
        defaultValues,
        onSubmit: async ({ value }) => {
            await onSubmit(value);
        },
        validators: {
            onChange: schema as any,
        }
    });

    if (onValueChange) {
        form.store.subscribe((state: any) => {
            onValueChange(state.values);
        });
    }

    return { 
        form,
        submit: form.handleSubmit
    };
}
