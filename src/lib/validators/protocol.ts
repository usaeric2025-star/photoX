import { Result } from 'neverthrow';

/**
 * @validator-contract StandardError
 * Standardized error structure for all validator engines.
 */
export interface StandardError {
    message: string;
    path: string[];
    aiDebugHint: string;
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
     * Explicit validation returning a neverthrow Result.
     */
    validate(input: unknown): Result<T, StandardError>;
    /**
     * Serialized metadata for AI assistance and runtime parity checks.
     */
    serialize(): ValidatorMeta;
    /**
     * Bottom-level engine schema (internal use only).
     */
    readonly schema: any;
}
