import { type Type, type } from 'arktype';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { Validator, ValidatorMeta } from '../protocol';

/**
 * @validator-contract ArkTypeValidator
 * Implementation of Validator interface using ArkType engine.
 * Specifically optimized for PhotoX Supabase schema mapping.
 */
export class ArkTypeValidator<T> implements Validator<T> {
    constructor(
        private arkSchema: Type<unknown>,
        private meta: ValidatorMeta
    ) {}

    get schema() {
        return this.arkSchema;
    }

    validate(input: unknown): T {
        const out = this.arkSchema(input);
        if (out instanceof type.errors) {
            // [ARKTYPE-ENGINE-COMPAT] Standardizing ArkType errors
            const errorList = Array.from(out as unknown as { path: string[], expected: string }[]);
            const firstError = errorList[0];
            
            throw ErrorFactory.validation(
                `Validation failed at ${firstError?.path?.join('.') || 'root'}. Expected ${firstError?.expected || 'valid data'}. ${this.meta.aiHints.join(' ')}`
            );
        }
        return out as T;
    }

    serialize(): ValidatorMeta {
        try {
            if (!this.meta) {
                throw ErrorFactory.fatal('Meta information is corrupted or missing', { context: 'serializeMetadata' });
            }
            return this.meta;
        } catch (e) {
            // [REPAIRABILITY-STRESS-TEST] Resilience fallback
            return { fields: {}, errorPatterns: [], aiHints: [] };
        }
    }
}
