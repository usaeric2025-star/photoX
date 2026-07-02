/**
 * Sanitizes and normalizes a photo/furniture item payload before database insertion or update.
 * Prevents SQL foreign key constraints and type mismatch errors by ensuring nullish values
 * (such as empty strings, "null", "undefined", or "uncategorized") are correctly mapped to null.
 */
export function sanitizePhotoPayload(payload: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = { ...payload };

    // Fields that should be strictly cast to integers or null
    const integerFields = ['categoryId', 'category_id'];
    
    // Fields that should be string-based UUID/text or null
    const nullableFields = ['groupId', 'group_id', 'manufacturerId', 'manufacturer_id', 'description', 'descriptionTranslations', 'description_translations'];

    // Fields that should be strictly cast to booleans
    const booleanFields = ['isGroupCover', 'is_group_cover', 'isPinned', 'is_pinned', 'isHidden', 'is_hidden', 'isAnalyzing', 'is_analyzing'];

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

    // 1. Map common snake_case keys to camelCase to prevent them from being dropped by VALID_KEYS
    const snakeToCamel: Record<string, string> = {
        'category_id': 'categoryId',
        'manufacturer_id': 'manufacturerId',
        'group_id': 'groupId',
        'is_group_cover': 'isGroupCover',
        'is_pinned': 'isPinned',
        'is_hidden': 'isHidden',
        'is_analyzing': 'isAnalyzing',
        'description_translations': 'descriptionTranslations'
    };
    
    for (const [snake, camel] of Object.entries(snakeToCamel)) {
        if (snake in sanitized) {
            sanitized[camel] = sanitized[snake];
            delete sanitized[snake];
        }
    }

    // 2. Sanitize integer fields
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

    // 3. Sanitize boolean fields
    for (const field of booleanFields) {
        if (field in sanitized) {
            const val = sanitized[field];
            if (val === 'true' || val === true || val === 1 || val === '1') {
                sanitized[field] = true;
            } else if (val === 'false' || val === false || val === 0 || val === '0' || isNullish(val)) {
                sanitized[field] = false;
            } else {
                sanitized[field] = !!val;
            }
        }
    }

    // 4. Filter out any unexpected non-schema fields to prevent SQL column-not-exist errors
    const VALID_KEYS = new Set([
      'id', 'userId', 'name', 'description', 'categoryId', 'manufacturerId',
      'groupId', 'isGroupCover', 'isPinned', 'imageUrl', 'imageHash', 'price',
      'note', 'type', 'isHidden', 'itemCode', 'manualCode', 'modelNumber',
      'descriptionTranslations', 'isAnalyzing', 'subCategory', 'dimensions',
      'groupOrder', 'metadata', 'updatedAt', 'createdAt', 'nameSearchable'
    ]);

    const filtered: Record<string, any> = {};
    for (const key of Object.keys(sanitized)) {
        if (VALID_KEYS.has(key)) {
            filtered[key] = sanitized[key];
        }
    }

    return filtered;
}
