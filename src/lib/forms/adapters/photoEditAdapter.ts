import { type PhotoEditFormData } from '#lib/valibot/schemas/photo.js';

export function photoEditAdapter(values: PhotoEditFormData, id: string, extra?: Record<string, unknown>) {
    return {
        ...values,
        id,
        ...extra
    };
}
