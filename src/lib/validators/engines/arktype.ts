import { type Type, type } from 'arktype';
import { success, errorFactory, type AppResult } from '@/lib/errorFactory';
import { Validator, StandardError, ValidatorMeta } from '../protocol';
import { ErrorFactory } from '@/lib/error/ErrorFactory';

/**
 * @validator-contract ArkTypeValidator
 * Implementation of Validator interface using ArkType engine.
 * Specifically optimized for PhotoX Supabase schema mapping.
 */
export class ArkTypeValidator<T> implements Validator<T> {
    constructor(
        private arkSchema: Type<any>,
        private meta: ValidatorMeta
    ) {}

    get schema() {
        return this.arkSchema;
    }

    validate(input: unknown): AppResult<T> {
        const out = this.arkSchema(input);
        if (out instanceof type.errors) {
            // [ARKTYPE-ENGINE-COMPAT] Standardizing ArkType errors
            const errorList = Array.from(out as any);
            const firstError = errorList[0] as any;
            
            return errorFactory(
                out.summary || 'Validation failed',
                'VALIDATION_ERROR',
                `Validation failed at ${firstError?.path?.join('.') || 'root'}. Expected ${firstError?.expected || 'valid data'}. ${this.meta.aiHints.join(' ')}`
            );
        }
        return success(out as T);
    }

    serialize(): ValidatorMeta {
        try {
            if (!this.meta) {
                throw ErrorFactory.wrap(new Error('Meta information is corrupted or missing'), 'serializeMetadata');
            }
            return this.meta;
        } catch (e) {
            // [REPAIRABILITY-STRESS-TEST] Resilience fallback
            return { fields: {}, errorPatterns: [], aiHints: [] };
        }
    }
}
