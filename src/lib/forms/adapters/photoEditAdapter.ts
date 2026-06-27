import { PhotoEditFormData } from '@/schemas/photoEdit';

export function photoEditAdapter(values: PhotoEditFormData, id: string, extra: any) {
    return {
        ...values,
        id,
        ...extra
    };
}
