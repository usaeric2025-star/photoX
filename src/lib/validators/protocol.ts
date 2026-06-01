import { type AppResult } from '@/lib/errorFactory';

/**
 * @validator-contract StandardError
 * Standardized error structure for all validator engines.
 */

export class StandardError extends Error {
    path: string[];
    aiDebugHint: string;
    originalError?: any;

    constructor(message: string, options?: { originalError?: any, aiDebugHint?: string, path?: string[] }) {
        super(message);
        this.name = 'StandardError';
        this.path = options?.path || [];
        this.aiDebugHint = options?.aiDebugHint || '';
        this.originalError = options?.originalError;
    }
}

/**
 * @validator-contract ValidatorMeta
 * Metadata for AI context and automated diagnostics.
 */
export interface ValidatorMeta {
    fields: Record<string, string>;
    relations?: string[];
    errorPatterns: string[];
    aiHints: string[];
}

/**
 * @validator-contract Validator<T>
 * APF (AI-Protocol-Friendly) Core Interface.
 * Decoupled from any specific validation engine (ArkType, Zod, etc.).
 */
export interface Validator<T> {
    /**
     * Explicit validation returning a AppResult.
     */
    validate(input: unknown): AppResult<T>;
    /**
     * Serialized metadata for AI assistance and runtime parity checks.
     */
    serialize(): ValidatorMeta;
    /**
     * Bottom-level engine schema (internal use only).
     */
    readonly schema: any;
}
