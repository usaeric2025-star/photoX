/**
 * Sanitizes and normalizes a photo/furniture item payload before database insertion or update.
 * Prevents SQL foreign key constraints and type mismatch errors by ensuring nullish values
 * (such as empty strings, "null", "undefined", or "uncategorized") are correctly mapped to null.
 */
export function sanitizePhotoPayload(payload: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = { ...payload };

    // Fields that should be strictly cast to integers or null
    const integerFields = ['categoryId'];
    
    // Fields that should be string-based UUID/text or null
    const nullableFields = ['groupId', 'manufacturerId', 'description', 'descriptionTranslations'];

    // Process all potential nullish values
    const isNullish = (val: any): boolean => {
        if (val === null || val === undefined) return true;
        if (typeof val === 'string') {
            const trimmed = val.trim();
            return trimmed === '' || 
                   trimmed.toLowerCase() === 'null' || 
                   trimmed.toLowerCase() === 'undefined' || 
                   trimmed.toLowerCase() === 'uncategorized';
        }
        return false;
    };

    // 1. Sanitize integer fields
    for (const field of integerFields) {
        if (field in sanitized) {
            const val = sanitized[field];
            if (isNullish(val)) {
                sanitized[field] = null;
            } else {
                const parsed = typeof val === 'string' ? parseInt(val, 10) : Number(val);
                sanitized[field] = isNaN(parsed) ? null : parsed;
            }
        }
    }

    // 2. Sanitize general nullable relation / text fields
    for (const field of nullableFields) {
        if (field in sanitized) {
            const val = sanitized[field];
            sanitized[field] = isNullish(val) ? null : val;
        }
    }

    return sanitized;
}
