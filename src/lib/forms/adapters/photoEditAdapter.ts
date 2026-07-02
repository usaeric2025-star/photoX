import { PhotoEditFormData } from '#src/schemas/photoEdit.js';

export function photoEditAdapter(values: PhotoEditFormData, id: string, extra?: Record<string, unknown>) {
    return {
        ...values,
        id,
        ...extra
    };
}
