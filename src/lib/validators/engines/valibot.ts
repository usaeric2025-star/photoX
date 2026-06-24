import * as v from 'valibot';
import { Validator, ValidatorMeta, StandardError } from '../protocol';

/**
 * @validator-contract ValibotValidator
 * Concrete implementation of the Validator interface using Valibot.
 * Provides high-performance, tree-shakable validation with APF metadata.
 */
export class ValibotValidator<T> implements Validator<T> {
    readonly schema: v.BaseSchema<any, T, any>;
    private readonly meta: ValidatorMeta;

    constructor(schema: v.BaseSchema<any, T, any>, meta: ValidatorMeta) {
        this.schema = schema;
        this.meta = meta;
    }

    validate(input: unknown): T {
        const result = v.safeParse(this.schema, input);
        
        if (!result.success) {
            const issue = result.issues[0];
            const path = issue.path?.map((p: any) => String(p.key)) || [];
            
            throw new StandardError(
                `Validation failed for field [${path.join('.')}]: ${issue.message}`,
                {
                    path,
                    originalError: result.issues,
                    aiDebugHint: this.meta.aiHints.join('; ')
                }
            );
        }

        return result.output;
    }

    serialize(): ValidatorMeta {
        return this.meta;
    }
}
