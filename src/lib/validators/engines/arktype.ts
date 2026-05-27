import { type Type, type } from 'arktype';
import { ok, err, Result } from 'neverthrow';
import { Validator, StandardError, ValidatorMeta } from '../protocol';

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

    validate(input: unknown): Result<T, StandardError> {
        const out = this.arkSchema(input);
        if (out instanceof type.errors) {
            // [ARKTYPE-ENGINE-COMPAT] Standardizing ArkType errors
            const errorList = Array.from(out as any);
            const firstError = errorList[0] as any;
            
            return err({
                message: out.summary || 'Validation failed',
                path: firstError?.path || [],
                aiDebugHint: `Validation failed at ${firstError?.path?.join('.') || 'root'}. Expected ${firstError?.expected || 'valid data'}. ${this.meta.aiHints.join(' ')}`
            });
        }
        return ok(out as T);
    }

    serialize(): ValidatorMeta {
        try {
            if (!this.meta) {
                throw new Error('Meta information is corrupted or missing');
            }
            return this.meta;
        } catch (e) {
            // [REPAIRABILITY-STRESS-TEST] Resilience fallback
            return { fields: {}, errorPatterns: [], aiHints: [] };
        }
    }
}
