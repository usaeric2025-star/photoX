import { PhotoEditFormData } from '@/schemas/photoEdit';

export function photoEditAdapter(values: PhotoEditFormData, id: string, extra?: Record<string, unknown>) {
    return {
        ...values,
        id,
        ...extra
    };
}
