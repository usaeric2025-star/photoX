import * as v from 'valibot';
import { ValibotValidator } from './engines/valibot';
import { Validator } from './protocol';

/**
 * @validator-contract createPhotoValidator
 * Factory for Photo validator. 
 * Enforces snake_case DB mapping and strict type safety for Photo mutations.
 */
export const createPhotoValidator = (): Validator<unknown> => {
    const photoSchema = v.object({
        id: v.optional(v.string()),
        user_id: v.optional(v.string()),
        name: v.optional(v.nullable(v.union([v.string(), v.record(v.string(), v.string())]))),
        description: v.optional(v.nullable(v.union([v.string(), v.record(v.string(), v.string())]))),
        description_translations: v.optional(v.nullable(v.record(v.string(), v.unknown()))),
        category_id: v.optional(v.nullable(v.string())),
        manufacturer_id: v.optional(v.nullable(v.string())),
        group_id: v.optional(v.nullable(v.string())),
        is_group_cover: v.optional(v.boolean()),
        is_pinned: v.optional(v.boolean()),
        image_url: v.optional(v.nullable(v.string())),
        price: v.optional(v.nullable(v.string())),
        note: v.optional(v.nullable(v.string())),
        type: v.optional(v.nullable(v.string())),
        is_hidden: v.optional(v.boolean()),
        item_code: v.optional(v.string()),
        updated_at: v.optional(v.string()),
        created_at: v.optional(v.string()),
    });

    return new ValibotValidator(photoSchema, {
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
export const createGroupValidator = (): Validator<unknown> => {
    const groupSchema = v.object({
        id: v.string(),
        user_id: v.optional(v.string()),
        name: v.optional(v.nullable(v.union([v.string(), v.record(v.string(), v.string())]))),
        description: v.optional(v.nullable(v.union([v.string(), v.record(v.string(), v.string())]))),
        description_translations: v.optional(v.nullable(v.record(v.string(), v.unknown()))),
        is_hidden: v.optional(v.boolean()),
        cover_photo_id: v.optional(v.nullable(v.string())),
        colors: v.optional(v.nullable(v.array(v.string()))),
        materials: v.optional(v.nullable(v.array(v.string()))),
        created_at: v.optional(v.string()),
        updated_at: v.optional(v.string()),
    });

    return new ValibotValidator(groupSchema, {
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
