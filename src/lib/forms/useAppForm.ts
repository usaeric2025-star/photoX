import { useForm, valibotValidator } from './index';
import { type BaseSchema, type BaseSchemaAsync } from 'valibot';

interface UseAppFormOptions<T extends BaseSchema<any, any, any> | BaseSchemaAsync<any, any, any>> {
    schema: T;
    defaultValues: any;
    onSubmit: (values: any) => Promise<void>;
}

export function useAppForm<T extends BaseSchema<any, any, any> | BaseSchemaAsync<any, any, any>>({
    schema,
    defaultValues,
    onSubmit
}: UseAppFormOptions<T>) {
    const form = useForm({
        validatorAdapter: valibotValidator(),
        defaultValues,
        onSubmit: async ({ value }) => {
            await onSubmit(value);
        },
        validators: {
            onChange: schema,
        }
    });

    return { form };
}
