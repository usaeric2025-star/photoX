import { type } from 'arktype';
import { ArkTypeValidator } from './engines/arktype';
import { Validator } from './protocol';

/**
 * @validator-contract createPhotoValidator
 * Factory for Photo validator. 
 * Enforces snake_case DB mapping and strict type safety for Photo mutations.
 */
export const createPhotoValidator = (): Validator<any> => {
    // ArkType requires strict mode for inference, but we are bypassing for compatibility
    const photoSchema = type({
        'id?': 'string',
        'user_id?': 'string',
        'name?': 'string|null',
        'description?': 'string|null',
        'description_translations?': 'Record<string, string>|null',
        'category_id?': 'string|null',
        'manufacturer_id?': 'string|null',
        'group_id?': 'string|null',
        'is_group_cover?': 'boolean',
        'is_pinned?': 'boolean',
        'image_url?': 'string|null',
        'thumb_hash?': 'string|null',
        'price?': 'string|null',
        'note?': 'string|null',
        'type?': 'string|null',
        'is_hidden?': 'boolean',
        'item_code?': 'string',
        'updated_at?': 'string',
        'created_at?': 'string',
    });

    return new ArkTypeValidator(photoSchema, {
        fields: {
            id: 'uuid',
            user_id: 'uuid',
            name: 'text',
            description: 'text',
            category_id: 'uuid',
            group_id: 'uuid',
            is_hidden: 'boolean',
            created_at: 'timestamptz',
            updated_at: 'timestamptz',
        },
        errorPatterns: ['missing_field', 'invalid_type', 'constraint_violation'],
        aiHints: [
            'Ensure snake_case for DB fields (is_hidden, created_at, group_id)',
            'Price should include currency prefix (RM)',
            'item_code must be unique'
        ]
    });
};

/**
 * @validator-contract createGroupValidator
 * Factory for ProductGroup validator.
 */
export const createGroupValidator = (): Validator<any> => {
    // ArkType requires strict mode for inference, but we are bypassing for compatibility
    const groupSchema = type({
        id: 'string',
        'user_id?': 'string',
        'name?': 'string',
        'description?': 'string|null',
        'description_translations?': 'Record<string, string>|null',
        'is_hidden?': 'boolean',
        'cover_photo_id?': 'string|null',
        'colors?': 'string[]|null',
        'materials?': 'string[]|null',
        'created_at?': 'string',
        'updated_at?': 'string',
    });

    return new ArkTypeValidator(groupSchema, {
        fields: {
            id: 'uuid',
            user_id: 'uuid',
            name: 'text',
            is_hidden: 'boolean',
            created_at: 'timestamptz',
            updated_at: 'timestamptz',
        },
        errorPatterns: ['missing_field', 'invalid_type'],
        aiHints: [
            'Ensure snake_case for DB fields',
            'Colors and materials are optional arrays'
        ]
    });
};
